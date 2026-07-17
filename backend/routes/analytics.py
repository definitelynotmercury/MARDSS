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

    current_year = date.today().year
    latest_data_year = current_year - 1
    previous_data_year = current_year - 2

    filters = ["(r.year  = %s OR r.year  = %s)"]
    where_clause = "WHERE " + " AND ".join(filters)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(f"""SELECT  m.municipality_name, r.year, CAST(SUM(r.request_count) AS UNSIGNED) AS total FROM assistance_records r 
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        GROUP BY m.municipality_name, r.year
        ORDER BY m.municipality_name, r.year 
        """, [latest_data_year, previous_data_year])
    
    data = cursor.fetchall()
    cursor.close()  
    conn.close()

    result = {}
    previous_year_total = 0
    current_year_total = 0
    for row in data:
        municipality_name = row['municipality_name']
        if municipality_name not in result:
            result[municipality_name] = {'municipality_name': municipality_name}
            result[municipality_name]['previous'] = int(row['total'])
        else:
            result[municipality_name]['current'] = int(row['total'])


    for municipality_name in result:
        item = result[municipality_name]
        prev = item.get('previous', 0)
        curr = item.get('current', 0)

        if prev > 0:
            item['growth_rate'] = round(((curr - prev) / prev) * 100, 1)
        else:
            item['growth_rate'] = 0
            
    final = list(result.values())

    final.sort(key=lambda x: x['current'], reverse=True)

    if selected_municipality != "ALL":
        result = [item for item in final if item["municipality_name"] == selected_municipality]
        return jsonify(result)
    
    final = final[:top_n]

    
    return(jsonify(final))

@analytics_bp.route('/api/analytics/narrative', methods=['POST'])
def generate_narrative():
    data = request.get_json()
    comparisonData = data.get('comparisonData', [])
    drilldown_Data = data.get('drilldown_data', [])
    rankings = data.get('rankings', [])

    prompt = f"""
        You are a data analyst reporting for the Provincial Social Welfare and Development Office (PSWDO) of Bulacan.
        Based on the following dashboard data, write a concise 3-4 sentence narrative that describes what the data shows.
        Do not suggest any actions or recommendations. Only explain the patterns, trends, and figures presented.

        -comparison between two municipalities across different assistance types, showing the total number of requests for each type in each municipality mentions the actual values of the requests THE NOTABLES ONES. {comparisonData}

        -drill-down data for a specific municipality, showing the breakdown of assistance requests by type explain the actual values. {drilldown_Data}

        -rankings of municipalities based on their total assistance requests and growth rates. {rankings}

        Be specific, mention actual numbers and names. Keep it professional and concise.
        """
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt
    )
    return jsonify({"narrative": response.text})