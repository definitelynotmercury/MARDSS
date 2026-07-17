from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG, client

dashboard_bp = Blueprint('dashboard', __name__)

MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

def get_db():
    return mysql.connector.connect(**DB_CONFIG)


@dashboard_bp.route('/api/dashboard/kpi')
def get_kpi():
    year = request.args.get('year', 'ALL')
    month = request.args.get('month', 'ALL')
    municipality = request.args.get('municipality', 'ALL')
    type_ = request.args.get('type', 'ALL')

    filters = []
    params = []

    if year != 'ALL':
        filters.append("r.year = %s")
        params.append(year)
    if municipality != 'ALL':
        filters.append("r.municipality_id = %s")
        params.append(municipality)
    if type_ != 'ALL':
        filters.append("r.assistance_type_id = %s")
        params.append(type_)
    if month != 'ALL':
        filters.append("r.month = %s")
        params.append(month)
    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute(f"""
            SELECT SUM(r.request_count) AS total 
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            {where_clause}
        """, params)
        sum_req = cursor.fetchone()

        cursor.execute(f"""
            SELECT a.type_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            {where_clause}
            GROUP BY r.assistance_type_id
            ORDER BY total DESC
            LIMIT 1
        """, params)
        highest_type = cursor.fetchone()

        cursor.execute(f"""
            SELECT m.municipality_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            {where_clause}
            GROUP BY r.municipality_id
            ORDER BY total DESC
            LIMIT 1
        """, params)
        highest_municipality = cursor.fetchone()

        cursor.close()
    finally:
        conn.close()

    return jsonify({
        "total_requests": sum_req["total"] or 0,
        "top_type": highest_type or {"type_name": "N/A", "total": 0},
        "top_municipality": highest_municipality or {"municipality_name": "N/A", "total": 0}
    })


@dashboard_bp.route("/api/dashboard/trend")
def get_dashboard_trend():
    conn = get_db()
    year = request.args.get("year", "ALL")

    try:
        cursor = conn.cursor(dictionary=True)

        if year == "ALL":
            
            cursor.execute("""
                SELECT r.year, a.type_name, SUM(r.request_count) AS total
                FROM assistance_records r
                JOIN assistance_types a ON r.assistance_type_id = a.type_id
                GROUP BY r.year, r.assistance_type_id
                ORDER BY r.year
            """)
        else:
            cursor.execute("""
                SELECT r.month, a.type_name, SUM(r.request_count) AS total
                FROM assistance_records r
                JOIN assistance_types a ON r.assistance_type_id = a.type_id
                WHERE r.year = %s
                GROUP BY r.month, r.assistance_type_id
                ORDER BY r.month
                           """,(int(year),))
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    result = {}
    key_field = 'year' if year == "ALL" else 'month'

    for row in data:
        key = row[key_field]

        if key_field == 'month':
            key = MONTH_NAMES[int(key) - 1]
        if key not in result:
            result[key] = {key_field: key}
        result[key][row['type_name']] = int(row['total'])

    return jsonify(list(result.values()))


@dashboard_bp.route("/api/dashboard/barchart")
def get_dashboard_barchart():
    year = request.args.get("year", "ALL")
    month = request.args.get("month", "ALL")

    filters = []        
    params = []         

    if year != "ALL":
        filters.append("r.year = %s")
        params.append(int(year))

    if month != "ALL":
        filters.append("r.month = %s")
        params.append(int(month))

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT m.municipality_name, SUM(request_count) AS total
            FROM assistance_records r
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            {where_clause}
            GROUP BY m.municipality_id
            ORDER BY total DESC
        """, params)          
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    return jsonify(data)


@dashboard_bp.route("/api/dashboard/irregularities")
def get_dashboard_irregularities():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT a.type_name, r.year, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            GROUP BY a.type_name, r.year
            ORDER BY a.type_name, r.year
        """)
        data = cursor.fetchall()

        cursor.execute("""
            SELECT m.municipality_name, a.type_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            GROUP BY m.municipality_id, a.type_name
        """)
        municipality_data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    alerts = []

    # Spike detection (year-over-year ≥ 100% increase)
    type_yearly = {}
    for row in data:
        name = row['type_name']
        if name not in type_yearly:
            type_yearly[name] = []
        type_yearly[name].append((row['year'], int(row['total'])))

    for type_name, year_data in type_yearly.items():
        for i in range(1, len(year_data)):
            prev_year, prev_total = year_data[i - 1]
            curr_year, curr_total = year_data[i]
            if prev_total == 0:
                continue
            pct_change = ((curr_total - prev_total) / prev_total) * 100
            if pct_change >= 100:
                alerts.append({
                    "type_name": type_name,
                    "from_year": prev_year,
                    "to_year": curr_year,
                    "from_total": prev_total,
                    "to_total": curr_total,
                    "pct_change": round(pct_change, 2),
                    "message": f"Requests jumped from {prev_total} to {curr_total} ({pct_change:.2f}% increase) in {curr_year}."
                })

    # Above-average municipality detection (≥ 2.5x provincial avg)
    type_muni = {}
    for row in municipality_data:
        name = row["type_name"]
        if name not in type_muni:
            type_muni[name] = []
        type_muni[name].append((row['municipality_name'], int(row['total'])))

    for type_name, muni_list in type_muni.items():
        totals = [total for _, total in muni_list]
        avg = sum(totals) / len(totals)
        for muni_name, muni_total in muni_list:
            if muni_total >= avg * 2.5 and muni_total >= 10:
                alerts.append({
                    "type": "above_average",
                    "type_name": type_name,
                    "municipality": muni_name,
                    "muni_total": muni_total,
                    "provincial_avg": round(avg, 1),
                    "pct_above": round(((muni_total / avg) - 1) * 100, 1),
                    "message": f"Above-average demand in {muni_name}. Requests up {round(((muni_total / avg) - 1) * 100, 1)}% vs. provincial average."
                })

    alerts.sort(key=lambda x: x.get('pct_change', x.get('pct_above', 0)), reverse=True)
    return jsonify(alerts[:6])


@dashboard_bp.route("/api/dashboard/narrative", methods=["POST"])
def generate_narrative():
    data = request.get_json()
    kpi = data.get("kpi", {})
    irregularities = data.get("irregularities", [])
    trend = data.get("trend", [])
    pie_data = data.get("pieData", [])
    bar_data = data.get("barData", [])
    filters = data.get("filters", {})

    # KPI filters
    year = filters.get("year", "ALL")
    municipality = filters.get("municipality", "ALL")
    type_ = filters.get("type", "ALL")
    month = filters.get("month", "ALL")

    # Chart-level filters
    line_type = filters.get("lineType", "ALL")
    top_n = filters.get("topN", 10)
    line_year = filters.get("lineYear", "ALL")
    pie_year = filters.get("pieYear", "ALL")
    top_n_pie = filters.get("topNPie", 5)
    pie_type = filters.get("pieType", "ALL")
    pie_month = filters.get("pieMonth", "ALL")
    bar_year = filters.get("barYear", "ALL")
    bar_month = filters.get("barMonth", "ALL")

    # Summarize trend — rows are keyed by 'year' when line_year == 'ALL',
    # or by 'month' when a specific year is selected
    trend_granularity = "month" if line_year != "ALL" else "year"
    trend_by_year = {}

    for row in trend:
        key = row.get(trend_granularity)
        if key is None:
            continue

        if line_type != "ALL":
            total = row.get(line_type, 0)
        else:
            total = sum(v for k, v in row.items() if k not in ("year", "month"))

        trend_by_year[key] = trend_by_year.get(key, 0) + total

    if trend_granularity == "year":
        sorted_trend = sorted(trend_by_year.items())
    else:
        sorted_trend = sorted(trend_by_year.items(), key=lambda kv: MONTH_NAMES.index(kv[0]))

    trend_summary_str = ", ".join(
        [f"{k}: {t} total requests" for k, t in sorted_trend]
    )

    # Line chart visible types (respect lineType filter)
    if line_type != "ALL":
        line_summary = f"Showing only: {line_type}"
    else:
        type_totals = {}
        for row in trend:
            for k, v in row.items():
                if k not in ("year", "month"):
                    type_totals[k] = type_totals.get(k, 0) + v
        top_line_types = sorted(type_totals.items(), key=lambda x: x[1], reverse=True)[:top_n]
        line_summary = [{"type": k, "total": v} for k, v in top_line_types]

    pie_summary = [{"type": p["name"], "value": p["value"]} for p in pie_data]
    bar_summary = [{"municipality": b["municipality_name"], "total": b["total"]} for b in bar_data[:5]]

    irregularity_messages = [i['message'] for i in irregularities] if irregularities else ["None detected"]

    month_name = MONTH_NAMES[int(month) - 1] if month != "ALL" else None
    if month_name and year != "ALL":
        kpi_period = f"{month_name} {year}"
    elif year != "ALL":
        kpi_period = f"the full year {year}"
    else:
        kpi_period = "the entire dataset (all years)"

    active_filters = (
        f"Global — Year: {year}, Month: {month_name or 'ALL'}, Municipality: {municipality}, Type: {type_} | "
        f"Line Chart — Type: {line_type}, Year: {line_year}, Top N: {top_n} | "
        f"Pie Chart — Year: {pie_year}, Month: {pie_month}, Type: {pie_type}, Top N: {top_n_pie} | "
        f"Bar Chart — Year: {bar_year}, Month: {bar_month}"
    )

    prompt = f"""
        You are a data analyst reporting for the Provincial Social Welfare and Development Office (PSWDO) of Bulacan.

        IMPORTANT: The KPI totals and top type/municipality below are scoped specifically to {kpi_period}.
        Your first sentence MUST explicitly name this period (e.g. "For {kpi_period}, ..."). 
        Never describe the KPI figures as a full-year or multi-year total unless kpi_period says so — 
        the KPI numbers below are ALREADY filtered to {kpi_period} only.

        Write a comprehensive but concise narrative (5-6 sentences) covering all sections of the dashboard based on the data below.
        Do not suggest actions or recommendations. Only describe what the data shows.
        Structure your narrative: overall totals (scoped to {kpi_period}) → {trend_granularity}-over-{trend_granularity} trend (this trend panel has its own independent year filter, separate from {kpi_period}) → type distribution → geographic breakdown → irregularities.
        Make sure to reflect the active filters in your narrative — if a specific type, year, or month is selected,
        describe only that context (e.g. "In March 2025..." rather than implying full-year totals when a month is set).

        - Active Filters: {active_filters}

        [KPI — scoped to {kpi_period}]
        - Total Requests: {kpi.get('total_requests')}
        - Top Assistance Type: {kpi.get('top_type', {}).get('type_name')} ({kpi.get('top_type', {}).get('total')} requests)
        - Top Municipality: {kpi.get('top_municipality', {}).get('municipality_name')} ({kpi.get('top_municipality', {}).get('total')} requests)

        [{trend_granularity.capitalize()}ly Trend - Line Chart]
        - Totals per {trend_granularity}: {trend_summary_str}
        - Visible types: {line_summary}
        if there is a specific lineType filter, mention only that type's trend instead of the overall trend.

        [Type Distribution - Pie Chart]
        - Breakdown: {pie_summary}

        [Top Municipalities - Bar Chart]
        - {bar_summary}

        [Irregularities]
        - {irregularity_messages}

        Be specific with numbers and names. Keep it professional.
    """

    response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=prompt
    )
    return jsonify({"narrative": response.text})


@dashboard_bp.route("/api/municipalities")
def get_municipalities():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM municipalities")
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()
    return jsonify(data)


@dashboard_bp.route("/api/assistance_types")
def get_assistance_types():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM assistance_types")
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()
    return jsonify(data)

@dashboard_bp.route("/api/dashboard/type-totals")
def get_type_totals():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT a.type_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            GROUP BY a.type_name
            ORDER BY total DESC
        """)
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    return jsonify([{"name": row["type_name"], "total": int(row["total"])} for row in data])


@dashboard_bp.route("/api/dashboard/pie")
def get_pie_data():
    top_n = int(request.args.get("top_n", 5))
    selected_type = request.args.get("type", "ALL")
    year = request.args.get("year", "ALL")
    month = request.args.get("month", "ALL")


    filters = []
    params = []

    if year != "ALL":
        filters.append("r.year = %s")
        params.append(int(year))

    if selected_type != "ALL":
        filters.append("a.type_name = %s")
        params.append(selected_type)

    if month != "ALL":
        filters.append("r.month = %s")
        params.append(month)

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)


        cursor.execute(f"""
            SELECT a.type_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            {where_clause}
            GROUP BY a.type_name
            ORDER BY total DESC
        """, params)
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    all_types = [{"name": row["type_name"], "value": int(row["total"])} for row in data]

    if selected_type != "ALL":
        result = [item for item in all_types if item["name"] == selected_type]
        return jsonify(result)

    top = all_types[:top_n]
    others_total = sum(item["value"] for item in all_types[top_n:])

    if others_total > 0:
        top.append({"name": "Others", "value": others_total})

    return jsonify(top)