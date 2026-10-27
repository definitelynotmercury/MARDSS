from xml.parsers.expat import model

from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG, client
import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import date
import matplotlib.pyplot as plt
from auth_utils import token_required
import os
from google.genai import errors

forecast_bp = Blueprint('forecast', __name__)

MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

MODEL_FALLBACKS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
]

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def lookup_name(table, id_col, name_col, value):
    if value == "ALL":
        return "ALL"
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"SELECT {name_col} FROM {table} WHERE {id_col} = %s", (value,))
        row = cursor.fetchone()
        cursor.close()
    finally:
        conn.close()
    return row[name_col] if row else value

   
@forecast_bp.route('/api/forecast/predict')
@token_required
def predict():
    muncipality = request.args.get('municipality', 'ALL')
    category = request.args.get('category', 'ALL')
    type_ = request.args.get('type', 'ALL')

    filters = []
    params = []

    if muncipality != 'ALL':
        filters.append("m.municipality_name = %s")
        params.append(muncipality)
    if category != 'ALL':
        filters.append("a.category_id = %s")
        params.append(int(category))
    if type_ != 'ALL':
        filters.append("a.type_name = %s")
        params.append(type_)

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(f"""
        SELECT a.type_name, m.municipality_name, r.year, r.month, SUM(r.request_count) AS total
        FROM assistance_records r
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        GROUP BY a.type_name, m.municipality_name, r.year, r.month
        ORDER BY a.type_name, m.municipality_name, r.year, r.month
        """, params)
    data = cursor.fetchall()
    cursor.close()
    conn.close()

    combined = {}
    for row in data:
        key = (row['year'], row['month'])
        combined[key] = combined.get(key, 0) + int(row['total'])

    sorted_keys = sorted(combined.keys())


    last_12 = sorted_keys[-12:]


    timeline = []

    for year, month in last_12:
        timeline.append({
            'label': f"{MONTH_NAMES[month - 1]} {year}",
            'year': year,
            'month': MONTH_NAMES[month - 1],
            'total': combined[(year, month)]
        })

    full_history = sorted_keys

    past_indexes = []
    totals = []

    for i, key in enumerate(full_history):
        past_indexes.append(i)
        totals.append(combined[key])


    past_indexes = np.array(past_indexes).reshape(-1, 1)
    totals = np.array(totals)

    model = LinearRegression()
    model.fit(past_indexes, totals)

    predict_range = 3
    last_index = len(full_history) - 1
    future_indexes = np.array([])

    for i in range(1,predict_range + 1):
        future_indexes = np.append(future_indexes,last_index + i).reshape(-1, 1).astype(int)

    future_prediction = model.predict(future_indexes)
    future_prediction = np.round(future_prediction)
    future_prediction = future_prediction.astype(int)
    print(future_prediction)

    past_indexes_prediction = model.predict(past_indexes)
    residuals = totals - past_indexes_prediction
    residuals_std = np.std(residuals)

    lower = np.round(future_prediction - (1.96 * residuals_std))
    upper = np.round(future_prediction + (1.96 * residuals_std))

    growth_rates = []

    for i in range(1,len(past_indexes)):
        current_value = totals[i]
        previous_value = totals[i-1]

        if previous_value == 0:
            continue

        growth_rate = (current_value - previous_value) / previous_value * 100
        growth_rates.append(growth_rate)

    average_growth_rate = np.mean(growth_rates)

    last_year, last_month = full_history[-1]
    future_labels = []
    y,m = last_year, last_month
    for _ in range(predict_range):
        m+=1
        if m > 12:
            m = 1
            y+=1
        future_labels.append({'year' : y, 'month': MONTH_NAMES[m - 1]})

    forecast = []
    for i, label in enumerate(future_labels):
        forecast.append({
            'label' : f"{label['month']} {label['year']}",
            'year' :  label['year'],
            'month' : label['month'],
            'future_prediction' : int(future_prediction[i]),
            'lower' : int(lower[i]),
            'upper' : int(upper[i])
        })


    return jsonify({
        "timeline": timeline,
        "forecast" : forecast,
        "average_growth_rate" : average_growth_rate
    })
                


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

@forecast_bp.route('/api/forecast/ranking')
@token_required
def forecast_ranking():
    municipality = request.args.get('municipality', 'ALL')
    category = request.args.get('category', 'ALL')

    filters = []
    params = []

    if municipality != 'ALL':
        filters.append("m.municipality_name = %s")
        params.append(municipality)
    if category != 'ALL':
        filters.append("a.category_id = %s")
        params.append(int(category))

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    # Category ALL -> rank categories. Category picked -> rank types inside it.
    label_col = "c.category_name" if category == 'ALL' else "a.type_name"

    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT {label_col} AS name, r.year, r.month, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN category c ON a.category_id = c.category_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            {where_clause}
            GROUP BY {label_col}, r.year, r.month
        """, params)
        rows = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    if not rows:
        return jsonify({"months": [], "rankings": []})

    # Build one continuous month timeline so months with no records count as 0
    keys = sorted({(r['year'], r['month']) for r in rows})
    last_year, last_month = keys[-1]
    timeline = []
    y, m = keys[0]
    while (y, m) <= (last_year, last_month):
        timeline.append((y, m))
        m += 1
        if m > 12:
            m = 1
            y += 1
    index_of = {key: i for i, key in enumerate(timeline)}

    series = {}
    for row in rows:
        totals = series.setdefault(row['name'], np.zeros(len(timeline)))
        totals[index_of[(row['year'], row['month'])]] = float(row['total'])

    # Labels for the next 3 months
    predict_range = 3
    month_labels = []
    y, m = last_year, last_month
    for _ in range(predict_range):
        m += 1
        if m > 12:
            m = 1
            y += 1
        month_labels.append(f"{MONTH_NAMES[m - 1]} {y}")

    X = np.arange(len(timeline)).reshape(-1, 1)
    future_X = np.arange(len(timeline), len(timeline) + predict_range).reshape(-1, 1)

    rankings = []
    for name, totals in series.items():
        model = LinearRegression().fit(X, totals)
        preds = np.maximum(np.round(model.predict(future_X)), 0).astype(int)
        rankings.append({
            "name": name,
            "predictions": [int(p) for p in preds],
            "total": int(preds.sum())
        })

    rankings.sort(key=lambda item: item["total"], reverse=True)
    for i, item in enumerate(rankings):
        item["rank"] = i + 1

    return jsonify({"months": month_labels, "rankings": rankings})

@forecast_bp.route('/api/forecast/narrative', methods=['POST'])
@token_required
def generate_narrative():
    data = request.get_json()

    # --- Forecast chart ---
    forecast_data = data.get('forecastData', {})
    selected_municipality = data.get('selectedMunicipality', 'ALL')
    selected_category = data.get('selectedCategory', 'ALL')
    selected_type = data.get('selectedType', 'ALL')
    timeline = forecast_data.get('timeline', [])
    forecast = forecast_data.get('forecast', [])
    avg_growth = forecast_data.get('average_growth_rate', 0)

    # --- Ranking card ---
    ranking_data = data.get('rankingData', {})
    rank_months = ranking_data.get('months', [])
    rankings = ranking_data.get('rankings', [])
    rank_category = data.get('rankCategory', 'ALL')
    rank_municipality = data.get('rankMunicipality', 'ALL')

    # --- Turn category IDs into names ---
    category_name = lookup_name("category", "category_id", "category_name", selected_category)
    rank_category_name = lookup_name("category", "category_id", "category_name", rank_category)

    # --- What does each section cover? ---
    chart_scope_parts = []
    if selected_category != 'ALL':
        chart_scope_parts.append(f"category '{category_name}'")
    if selected_type != 'ALL':
        chart_scope_parts.append(f"type '{selected_type}'")
    chart_scope = ", ".join(chart_scope_parts) if chart_scope_parts else "all categories and types"
    chart_place = selected_municipality if selected_municipality != 'ALL' else "the entire province"

    if rank_category == 'ALL':
        ranking_scope = "The ranking lists assistance CATEGORIES"
    else:
        ranking_scope = (
            f"The ranking lists the assistance TYPES within the category '{rank_category_name}'"
        )
    rank_place = rank_municipality if rank_municipality != 'ALL' else "the entire province"

    prompt = f"""
        You are a data analyst reporting for the Provincial Social Welfare and Development Office (PSWDO) of Bulacan.
        Based on the following dashboard data, write a concise 4-5 sentence narrative that describes what the data shows.
        Do not suggest any actions or recommendations. Only explain the patterns, trends, and figures presented.
        Each section below has its own independent filters, so do not apply one section's filters to another.

        [Demand Forecast Chart]
        - Area: {chart_place}
        - Scope: {chart_scope}
        - Historical monthly totals (last 12 months): {timeline}
        - Predicted totals for the next 3 months, with 95% confidence intervals (lower/upper): {forecast}
        - Average month-over-month growth rate: {round(avg_growth, 2)}%

        [Projected Demand Ranking]
        - Area: {rank_place}
        - {ranking_scope}
        - Ranked by total projected requests over the next 3 months ({', '.join(rank_months)})
        - Data (rank 1 is highest; "predictions" are per month in the order above, "total" is the sum): {rankings}

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