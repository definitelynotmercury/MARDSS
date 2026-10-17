import calendar
from flask import Blueprint
import mysql.connector
from config import DB_CONFIG

irregularity_detector_bp = Blueprint('irregularity_detector', __name__)

SPIKE_PCT = 100          # flag if the month at least doubled vs. same month last year
MIN_VOLUME = 10          # ignore tiny monthly counts (percentages are noise)
MUNI_MULTIPLIER = 2.5    # municipality must be >= 2.5x the average for a type
MUNI_MIN_VOLUME = 10


def get_db():
    return mysql.connector.connect(**DB_CONFIG)


def detect_and_store_irregularities(year, month):
    # Same month, previous year (e.g. Mar 2025 is compared with Mar 2024)
    prev_year = year - 1
    month_abbr = calendar.month_abbr[month]
    month_label = f"{month_abbr} {year}"
    prev_label = f"{month_abbr} {prev_year}"

    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)

        # Current month totals per assistance type
        cursor.execute("""
            SELECT a.type_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            WHERE r.year = %s AND r.month = %s
            GROUP BY a.type_id, a.type_name
        """, (year, month))
        current_totals = {row['type_name']: int(row['total'] or 0) for row in cursor.fetchall()}

        # Same month, last year, per assistance type
        cursor.execute("""
            SELECT a.type_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            WHERE r.year = %s AND r.month = %s
            GROUP BY a.type_id, a.type_name
        """, (prev_year, month))
        prev_totals = {row['type_name']: int(row['total'] or 0) for row in cursor.fetchall()}

        # Current month totals per municipality per type
        cursor.execute("""
            SELECT a.type_name, m.municipality_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            WHERE r.year = %s AND r.month = %s
            GROUP BY a.type_name, m.municipality_id, m.municipality_name
        """, (year, month))
        muni_rows = cursor.fetchall()

        alerts = []

        # Spike detection: same month last year, >= SPIKE_PCT increase
        for type_name, curr_total in current_totals.items():
            prev_total = prev_totals.get(type_name, 0)
            if prev_total == 0:
                continue                  # no baseline (e.g. first year of data)
            if curr_total < MIN_VOLUME:
                continue                  # too small to be meaningful
            pct_change = ((curr_total - prev_total) / prev_total) * 100
            if pct_change >= SPIKE_PCT:
                alert_key = f"spike_yoy__{type_name}__{year}_{month:02d}"
                alerts.append({
                    "alert_key": alert_key,
                    "alert_type": "spike",
                    "type_name": type_name,
                    "message": (
                        f"{type_name} requests in {month_label} rose from {prev_total} "
                        f"to {curr_total} (+{pct_change:.1f}%) compared with {prev_label}."
                    )
                })

        # Above-average municipality detection (unchanged rule, same month only)
        type_muni = {}
        for row in muni_rows:
            type_muni.setdefault(row['type_name'], []).append(
                (row['municipality_name'], int(row['total'] or 0))
            )

        for type_name, muni_list in type_muni.items():
            avg = sum(t for _, t in muni_list) / len(muni_list)
            if avg == 0:
                continue
            for muni_name, muni_total in muni_list:
                if muni_total >= avg * MUNI_MULTIPLIER and muni_total >= MUNI_MIN_VOLUME:
                    pct_above = round(((muni_total / avg) - 1) * 100, 1)
                    alert_key = f"above_avg__{type_name}__{muni_name}__{year}_{month:02d}"
                    alerts.append({
                        "alert_key": alert_key,
                        "alert_type": "above_average",
                        "type_name": type_name,
                        "message": (
                            f"Above-average {type_name} demand in {muni_name} for {month_label}. "
                            f"Requests up {pct_above}% vs. provincial average."
                        )
                    })

        # Store alerts, skipping duplicates via the UNIQUE KEY on alert_key
        insert_sql = """
            INSERT IGNORE INTO notifications
                (alert_key, alert_type, type_name, message)
            VALUES (%s, %s, %s, %s)
        """
        for alert in alerts:
            cursor.execute(insert_sql, (
                alert['alert_key'],
                alert['alert_type'],
                alert['type_name'],
                alert['message']
            ))

        conn.commit()
        cursor.close()
    finally:
        conn.close()