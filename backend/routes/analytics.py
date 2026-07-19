from flask import Blueprint, jsonify, request
import mysql.connector
from datetime import date
from config import DB_CONFIG, client

analytics_bp = Blueprint('analytics',__name__)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)


@analytics_bp.route('/api/analytics/comparison')
def comparison():
    municipality_1 = request.args.get('municipality_1', 'BULAKAN')
    municipality_2 = request.args.get('municipality_2', 'HAGONOY')
    type_ = request.args.get('type', 'ALL')
    year = request.args.get('year', 'ALL')
    month = request.args.get('month', 'ALL')

    filters = ["(m.municipality_name = %s OR m.municipality_name = %s)"]
    params = [municipality_1, municipality_2]

    if year != 'ALL':
        filters.append("r.year = %s")
        params.append(year)

    if type_ != 'ALL':
        filters.append("a.type_name = %s")
        params.append(type_)

    if month != 'ALL':
        filters.append("r.month = %s")
        params.append(month)

    where_clause = "WHERE " + " AND ".join(filters)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(f"""
        SELECT a.type_name, m.municipality_name, SUM(r.request_count) AS total
        FROM assistance_records r
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        GROUP BY m.municipality_name, a.type_name
        ORDER BY a.type_name
    """, params)

    data = cursor.fetchall()
    cursor.close()
    conn.close()

    result = {}
    for row in data:
        type_name = row['type_name']
        if type_name not in result:
            result[type_name] = {'type_name': type_name}
        result[type_name][row['municipality_name']] = int(row['total'])

    final = list(result.values())
    return jsonify(final)


@analytics_bp.route('/api/analytics/drill_down')
def drill_down():
    municipality = request.args.get('municipality', 'BULAKAN')
    selected_year = request.args.get('year', 'ALL')
    month = request.args.get('month', 'ALL')
    
    filters = ["(m.municipality_name = %s)"]
    params = [municipality]

    if selected_year != 'ALL':
        filters.append("r.year = %s")
        params.append(selected_year)
    
    if month != 'ALL':
        filters.append("r.month = %s")
        params.append(month)

    where_clause = "WHERE " + " AND ".join(filters)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(f"""
        SELECT a.type_name, m.municipality_name, CAST(SUM(r.request_count) AS UNSIGNED) AS total FROM assistance_records r 
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        GROUP BY m.municipality_name, a.type_name
        ORDER BY total DESC
    """, params)

    data = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(data)

@analytics_bp.route('/api/analytics/n_rankings')
def n_rankings():
    top_n = int(request.args.get("topN", 5))
    selected_municipality = request.args.get("selectedMunicipalityRanking", "ALL")
    month = int(request.args.get("month", date.today().month))

    current_year = date.today().year
    previous_year = current_year - 1

    filters = ["(r.year = %s OR r.year = %s)", "r.month = %s"]
    params = [current_year, previous_year, month]

    where_clause = "WHERE " + " AND ".join(filters)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(f"""SELECT m.municipality_name, r.year, CAST(SUM(r.request_count) AS UNSIGNED) AS total FROM assistance_records r 
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        GROUP BY m.municipality_name, r.year
        ORDER BY m.municipality_name, r.year 
        """, params)
    
    data = cursor.fetchall()
    cursor.close()  
    conn.close()

    result = {}
    for row in data:
        municipality_name = row['municipality_name']
        if municipality_name not in result:
            result[municipality_name] = {'municipality_name': municipality_name, 'previous': 0, 'current': 0}

        if row['year'] == previous_year:
            result[municipality_name]['previous'] = int(row['total'])
        elif row['year'] == current_year:
            result[municipality_name]['current'] = int(row['total'])

    for municipality_name in result:
        item = result[municipality_name]
        prev = item['previous']
        curr = item['current']

        if prev > 0:
            item['growth_rate'] = round(((curr - prev) / prev) * 100, 1)
        elif curr > 0:
            item['growth_rate'] = 100.0
        else:
            item['growth_rate'] = 0

    final = list(result.values())
    final.sort(key=lambda x: x['current'], reverse=True)

    if selected_municipality != "ALL":
        result = [item for item in final if item["municipality_name"] == selected_municipality]
        return jsonify(result)

    final = final[:top_n]
    return jsonify(final)

@analytics_bp.route('/api/analytics/narrative', methods=['POST'])
def generate_narrative():
    data = request.get_json()
    comparisonData = data.get('comparisonData', [])
    comparisonMonth = data.get('comparisonMonth', 'ALL')
    comparisonSelectedYear = data.get('selectedYear', 'ALL')

    drilldown_Data = data.get('drilldown_data', [])
    drill_down_year = data.get('drill_down_year', 'ALL')
    drill_down_month = data.get('drill_down_month', 'ALL')
    rankings = data.get('rankings', [])


    prompt = f"""
        You are a data analyst reporting for the Provincial Social Welfare and Development Office (PSWDO) of Bulacan.
        Based on the following dashboard data, write a concise 3-4 sentence narrative that describes what the data shows.
        Do not suggest any actions or recommendations. Only explain the patterns, trends, and figures presented.

        -comparison between two municipalities across different assistance types, showing the total number of requests for each type in each municipality mentions the actual values of the requests THE NOTABLES ONES{comparisonData}. Now if there is a selected year and month, mention the actual values for that specific year and month. {comparisonSelectedYear} {comparisonMonth}

        -drill-down data for a specific municipality, showing the breakdown of assistance requests by type explain the actual values{drilldown_Data}. if there is a selected year and month, mention the actual values for that specific year and month. {drill_down_year} {drill_down_month}

        -rankings of municipalities based on their total assistance requests and growth rates. {rankings}

        Be specific, mention actual numbers and names. Keep it professional and concise.
        """
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt
    )
    return jsonify({"narrative": response.text})

@analytics_bp.route('/api/analytics/latest_month')
def latest_month():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT year, month FROM assistance_records
        ORDER BY year DESC, month DESC
        LIMIT 1
    """)

    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row:
        return jsonify({'year': row['year'], 'month': row['month']})
    else:
        return jsonify({'year': date.today().year, 'month': date.today().month})
    
@analytics_bp.route('/api/analytics/available_months')
def available_months():
    current_year = date.today().year

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT MAX(month) AS latest_month FROM assistance_records
        WHERE year = %s
    """, [current_year])

    row = cursor.fetchone()
    cursor.close()
    conn.close()

    latest_month = row['latest_month'] if row and row['latest_month'] else 1

    return jsonify([{'year': current_year, 'month': m} for m in range(1, latest_month + 1)])
