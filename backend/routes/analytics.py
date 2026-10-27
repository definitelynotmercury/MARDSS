from flask import Blueprint, jsonify, request
import mysql.connector
from datetime import date
from config import DB_CONFIG, client
from auth_utils import token_required
import os
from google.genai import errors


MODEL_FALLBACKS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
]


analytics_bp = Blueprint('analytics',__name__)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)



@analytics_bp.route('/api/analytics/comparison')
@token_required
def comparison():
    municipality_1 = request.args.get('municipality_1', 'ANGAT')
    municipality_2 = request.args.get('municipality_2', 'BALAGTAS')
    category = request.args.get('category', 'ALL')
    type_ = request.args.get('type', 'ALL')
    year = request.args.get('year', 'ALL')
    month = request.args.get('month', 'ALL')

    filters = ["(m.municipality_name = %s OR m.municipality_name = %s)"]
    params = [municipality_1, municipality_2]

    if year != 'ALL':
        filters.append("r.year = %s")
        params.append(year)

    if category != 'ALL':
        filters.append("a.category_id = %s")
        params.append(int(category))

    if type_ != 'ALL':
        filters.append("a.type_name = %s")
        params.append(type_)

    if month != 'ALL':
        filters.append("r.month = %s")
        params.append(month)

    where_clause = "WHERE " + " AND ".join(filters)

    if category == 'ALL':
        label_col = "c.category_name"
    else:
        label_col = "a.type_name"

    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT {label_col} AS name, m.municipality_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN category c ON a.category_id = c.category_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            {where_clause}
            GROUP BY m.municipality_name, {label_col}
            ORDER BY {label_col}
        """, params)
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    result = {}
    for row in data:
        name = row['name']
        if name not in result:
            result[name] = {'name': name}
        result[name][row['municipality_name']] = int(row['total'])

    return jsonify(list(result.values()))


@analytics_bp.route('/api/analytics/drill_down')
@token_required
def drill_down():
    municipality = request.args.get('municipality', 'ANGAT')
    category = request.args.get('category', 'ALL')
    selected_year = request.args.get('year', 'ALL')
    month = request.args.get('month', 'ALL')

    filters = ["(m.municipality_name = %s)"]
    params = [municipality]

    if category != 'ALL':
        filters.append("a.category_id = %s")
        params.append(int(category))

    if selected_year != 'ALL':
        filters.append("r.year = %s")
        params.append(selected_year)

    if month != 'ALL':
        filters.append("r.month = %s")
        params.append(month)

    where_clause = "WHERE " + " AND ".join(filters)

    label_col = "c.category_name" if category == 'ALL' else "a.type_name"

    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT {label_col} AS name, CAST(SUM(r.request_count) AS UNSIGNED) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN category c ON a.category_id = c.category_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            {where_clause}
            GROUP BY {label_col}
            ORDER BY total DESC
        """, params)
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    return jsonify(data)

@analytics_bp.route('/api/analytics/n_rankings')
@token_required
def n_rankings():
    top_n = int(request.args.get("topN", 5))
    selected_municipality = request.args.get("selectedMunicipalityRanking", "ALL")
    month_param = request.args.get("month", "ALL")
    month = None if month_param == "ALL" else int(month_param)

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


def generate_with_fallback(prompt):
    last_error = None

    for model_name in MODEL_FALLBACKS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            return response.text
        except errors.APIError as e:
            last_error = e
            if e.code in (429, 500, 503):
                print(f"{model_name} failed ({e.code}), trying next model...")
                continue
            raise

    raise last_error



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
    try:
        narrative = generate_with_fallback(prompt)
        return jsonify({"narrative": narrative})
    except errors.APIError as e:
        print(e)
        return jsonify({
            "narrative": None,
            "error": "The AI service is busy right now. Please try again in a moment."
        }), 503

@analytics_bp.route('/api/analytics/latest_month')
@token_required
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
@token_required
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

    return jsonify([{'month': m} for m in range(1, latest_month + 1)])
