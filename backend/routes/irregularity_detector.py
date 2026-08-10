from flask import Blueprint
import mysql.connector
from config import DB_CONFIG

irregularity_detector_bp = Blueprint('irregularity_detector', __name__)
def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def get_prev_month(year, month):
    if month == 1:
        return year - 1, 12
    return year, month - 1

def detect_and_store_irregularities(year, month, user_id):
    prev_year, prev_month = get_prev_month(year, month)
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)

        # Get current month totals per assistance type
        cursor.execute("""
            SELECT a.type_name, a.type_id, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            WHERE r.year = %s AND r.month = %s
            GROUP BY a.type_id, a.type_name
        """, (year, month))
        current_totals = {row['type_name']: row for row in cursor.fetchall()}

        # Get previous month totals per assistance type
        cursor.execute("""
            SELECT a.type_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            WHERE r.year = %s AND r.month = %s
            GROUP BY a.type_name
        """, (prev_year, prev_month))
        prev_totals = {row['type_name']: int(row['total']) for row in cursor.fetchall()}

        # Get current month totals per municipality per type
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

        # Spike detection — month-over-month >= 100% increase
        for type_name, curr_row in current_totals.items():
            curr_total = int(curr_row['total'])
            prev_total = prev_totals.get(type_name, 0)
            if prev_total == 0:
                continue
            pct_change = ((curr_total - prev_total) / prev_total) * 100
            if pct_change >= 100:
                alert_key = f"spike__{type_name}__{prev_year}_{prev_month:02d}__{year}_{month:02d}"
                alerts.append({
                    "alert_key": alert_key,
                    "alert_type": "spike",
                    "type_name": type_name,
                    "message": f"Requests jumped from {prev_total} to {curr_total} ({pct_change:.2f}% increase) compared to last month."
                })

        # Above-average municipality detection >= 2.5x provincial avg
        type_muni = {}
        for row in muni_rows:
            name = row['type_name']
            if name not in type_muni:
                type_muni[name] = []
            type_muni[name].append((row['municipality_name'], int(row['total'])))

        for type_name, muni_list in type_muni.items():
            totals = [t for _, t in muni_list]
            avg = sum(totals) / len(totals)
            if avg == 0:
                continue
            for muni_name, muni_total in muni_list:
                if muni_total >= avg * 2.5 and muni_total >= 10:
                    pct_above = round(((muni_total / avg) - 1) * 100, 1)
                    alert_key = f"above_avg__{type_name}__{muni_name}__{year}_{month:02d}"
                    alerts.append({
                        "alert_key": alert_key,
                        "alert_type": "above_average",
                        "type_name": type_name,
                        "message": f"Above-average demand in {muni_name}. Requests up {pct_above}% vs. provincial average."
                    })

        # Store alerts — skip duplicates via UNIQUE KEY
        insert_sql = """
            INSERT IGNORE INTO notifications
                (user_id, alert_key, alert_type, type_name, message)
            VALUES (%s, %s, %s, %s, %s)
        """
        for alert in alerts:
            cursor.execute(insert_sql, (
                user_id,
                alert['alert_key'],
                alert['alert_type'],
                alert['type_name'],
                alert['message']
            ))

        conn.commit()
        cursor.close()
    finally:
        conn.close()