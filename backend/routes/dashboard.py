from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG, GEMINI_API_KEY
from google import genai

dashboard_bp = Blueprint('dashboard', __name__)

client = genai.Client(api_key=GEMINI_API_KEY)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

@dashboard_bp.route('/api/dashboard/kpi')
def get_kpi():
    year = request.args.get('year', 'ALL')
    municipality = request.args.get('municipality', 'ALL')
    type_ = request.args.get('type', 'ALL')

    filters = []
    params = []

    if year != 'ALL':
        filters.append("r.year = %s")
        params.append(year)

    if municipality != "ALL":
        filters.append("r.municipality_id = %s")
        params.append(municipality)

    if type_ != "ALL":
        filters.append("r.assistance_type_id = %s")
        params.append(type_)

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    conn = get_db()
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
    conn.close()

    return jsonify({
        "total_requests": sum_req["total"] or 0,
        "top_type": highest_type,
        "top_municipality": highest_municipality
    })

@dashboard_bp.route("/api/dashboard/trend")
def get_dashboard_trend():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT r.year, a.type_name, SUM(r.request_count) AS total FROM assistance_records r JOIN assistance_types a ON r.assistance_type_id = a.type_id GROUP BY r.year, r.assistance_type_id ORDER BY r.year")
    data = cursor.fetchall()
    cursor.close()
    conn.close()

    result = {}
    for row in data:
        year = row['year']
        if year not in result:
            result[year] = {'year': year}
        result[year][row['type_name']] = int(row['total'])

    return jsonify(list(result.values()))

@dashboard_bp.route("/api/dashboard/barchart")
def get_dashboard_barchart():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT m.municipality_name, SUM(request_count) AS total FROM assistance_records r JOIN municipalities m ON r.municipality_id = m.municipality_id GROUP BY m.municipality_id ORDER BY SUM(request_count) DESC")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@dashboard_bp.route("/api/dashboard/irregularities")
def get_dashboard_irregularities():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT a.type_name, r.year, SUM(r.request_count) AS total FROM assistance_records r JOIN assistance_types a ON r.assistance_type_id = a.type_id GROUP BY a.type_name, r.year ORDER BY a.type_name, r.year")
    data = cursor.fetchall()

    cursor.execute("SELECT m.municipality_name, a.type_name, SUM(r.request_count) AS total FROM assistance_records r JOIN assistance_types a ON r.assistance_type_id = a.type_id JOIN municipalities m ON r.municipality_id = m.municipality_id GROUP BY m.municipality_id, a.type_name")
    municipality_data = cursor.fetchall()
    cursor.close()
    conn.close()

    alerts = []
    type_yearly = {}
    for row in data:
        name = row['type_name']
        if name not in type_yearly:
            type_yearly[name] = []
        type_yearly[name].append((row['year'], int(row['total'])))

    for type_name in type_yearly:
        year_data = type_yearly[type_name]
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

    type_muni = {}
    for row in municipality_data:
        name = row["type_name"]
        if name not in type_muni:
            type_muni[name] = []
        type_muni[name].append((row['municipality_name'], int(row['total'])))

    for type_name in type_muni:
        muni_data = type_muni[type_name]
        totals = [total for _, total in muni_data]
        avg = sum(totals) / len(totals)
        for muni_name, muni_total in muni_data:
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
    municipalities = data.get("municipalities", [])

    prompt = f"""
You are a data analyst reporting for the Provincial Social Welfare and Development Office (PSWDO) of Bulacan.
Based on the following dashboard data, write a concise 3-4 sentence narrative that describes what the data shows. 
Do not suggest any actions or recommendations. Only explain the patterns, trends, and figures presented.

- Total Requests: {kpi.get('total_requests')}
- Top Assistance Type: {kpi.get('top_type', {}).get('type_name')} ({kpi.get('top_type', {}).get('total')} requests)
- Top Municipality: {kpi.get('top_municipality', {}).get('municipality_name')} ({kpi.get('top_municipality', {}).get('total')} requests)
- Irregularities: {[i['message'] for i in irregularities]}
- Yearly Trend by Assistance Type: {trend}
- Top Municipalities by Volume: {municipalities[:5]}

Be specific, mention actual numbers and names. Keep it professional and concise.
    """

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt
    )
    return jsonify({"narrative": response.text})

@dashboard_bp.route("/api/municipalities")
def get_municipalities():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM municipalities")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@dashboard_bp.route("/api/assistance_types")
def get_assistance_types():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM assistance_types")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)