from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG, client
import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import date

forecast_bp = Blueprint('forecast', __name__)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

   
@forecast_bp.route('/api/forecast/predict')
def predict():
    muncipality = request.args.get('municipality', 'ALL')
    type_ = request.args.get('type', 'ALL')

    filters = []
    params = []

    if muncipality != 'ALL':
        filters.append("m.municipality_name = %s")
        params.append(muncipality)
    if type_ != 'ALL':
        filters.append("a.type_name = %s")
        params.append(type_)

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(f"""
        SELECT a.type_name, m.municipality_name, r.year, SUM(r.request_count) AS total
        FROM assistance_records r
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        GROUP BY a.type_name, m.municipality_name, r.year
        ORDER BY a.type_name, m.municipality_name, r.year
        """, params)
    data = cursor.fetchall()
    cursor.close()
    conn.close()

    yearly_totals = {}
    for row in data:
        year = row['year']
        total = int(row['total'])
        if year not in yearly_totals:
            yearly_totals[year] = 0
        yearly_totals[year] += total

    years = sorted(yearly_totals.keys())
    totals = [yearly_totals[y] for y in years]

    historical_years = np.array(years).reshape(-1, 1)
    historical_totals = np.array(totals)

    model = LinearRegression()
    model.fit(historical_years, historical_totals)

    y_pred_train = model.predict(historical_years)
    residuals = historical_totals - y_pred_train
    residual_std = np.std(residuals) 

    current_year = max(years)
    future_years = [current_year + 1, current_year + 2]

    future_X = np.array(future_years).reshape(-1, 1)
    future_predictions = np.round(model.predict(future_X))

    lower = np.round(future_predictions - (1.96 * residual_std))
    upper = np.round(future_predictions + (1.96 * residual_std))

    growth_rates = []   

    for i in range(1, len(historical_totals)):
        current = historical_totals[i]
        previous = historical_totals[i - 1]

        growth_rate = (current - previous) / previous * 100
        growth_rates.append(growth_rate)

    average_growth_rate = np.mean(growth_rates)

    return jsonify({
        "avg_growth_rate": average_growth_rate,
        "historical_years": historical_years.flatten().tolist(),
        "historical_totals": historical_totals.tolist(),
        "future_years": future_years,
        "future_predictions": future_predictions.tolist(),
        "lower_bound": lower.tolist(),
        "upper_bound": upper.tolist()
    })

@forecast_bp.route('/api/forecast/narrative', methods=['POST'])
def generate_narrative():
    data = request.get_json()
    forecast = data.get('forecastData', {})
    selected_municipality = data.get('selectedMunicipality', 'ALL')
    selected_type = data.get('selectedType', 'ALL')

    historical_years = forecast.get('historical_years', [])
    historical_totals = forecast.get('historical_totals', [])
    future_years = forecast.get('future_years', [])
    forecastData = forecast.get('future_predictions', [0, 0])
    lower_bound = forecast.get('lower_bound', [0, 0])
    upper_bound = forecast.get('upper_bound', [0, 0])

    prompt = f"""
        You are a data analyst reporting for the Provincial Social Welfare and Development Office (PSWDO) of Bulacan.
        Based on the following dashboard data, write a concise 3-4 sentence narrative that describes what the data shows.
        Do not suggest any actions or recommendations. Only explain the patterns, trends, and figures presented.

        -selected municipality: {selected_municipality} - if it says all, it means the data is for the entire province
        -selected assistance type: {selected_type} - if it says all, it means the data includes all types of assistance
        -Historical data of total assistance requests from {historical_years[0]} to {historical_years[-1]}: {historical_totals}
        -Predicted totals for the next two years ({future_years[0]} and {future_years[1]}): {forecastData}
        -95% confidence intervals for the forecasts: {list(zip(lower_bound, upper_bound))}

        
        """
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt
    )
    

    return jsonify({"narrative": response.text})
