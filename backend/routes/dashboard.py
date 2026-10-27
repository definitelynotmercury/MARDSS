from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG, client
from auth_utils import token_required
import os
from google.genai import errors

dashboard_bp = Blueprint('dashboard', __name__)

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


@dashboard_bp.route('/api/dashboard/kpi')
@token_required
def get_kpi():
    year = request.args.get('year', 'ALL')
    month = request.args.get('month', 'ALL')
    municipality = request.args.get('municipality', 'ALL')
    category = request.args.get('category', 'ALL')
    type_ = request.args.get('type', 'ALL')

    filters = []
    params = []

    if year != 'ALL':
        filters.append("r.year = %s")
        params.append(year)
    if municipality != 'ALL':
        filters.append("r.municipality_id = %s")
        params.append(municipality)
    if category != 'ALL':
       filters.append("a.category_id = %s")
       params.append(category)
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

        if category == 'ALL' and type_ == 'ALL':
            cursor.execute(f"""
                SELECT c.category_name AS name, SUM(r.request_count) AS total
                FROM assistance_records r
                JOIN assistance_types a ON r.assistance_type_id = a.type_id
                JOIN category c ON a.category_id = c.category_id
                JOIN municipalities m ON r.municipality_id = m.municipality_id
                {where_clause}
                GROUP BY c.category_id
                ORDER BY total DESC
                LIMIT 1
            """, params)
        else:
            cursor.execute(f"""
                SELECT a.type_name AS name, SUM(r.request_count) AS total
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
        "top_type": highest_type or {"name": "N/A", "total": 0},
        "top_municipality": highest_municipality or {"municipality_name": "N/A", "total": 0}
    })


@dashboard_bp.route("/api/dashboard/trend")
@token_required
def get_dashboard_trend():
    conn = get_db()
    year = request.args.get("year", "ALL")
    type_ = request.args.get("type", "ALL")
    category = request.args.get("category", "ALL")
    filters = []
    params = []
    if category != "ALL":
        filters.append("a.category_id = %s")
        params.append(category)
    if type_ != "ALL":
        filters.append("a.type_name = %s")
        params.append(type_)

    try:
        cursor = conn.cursor(dictionary=True)

        if year == "ALL":
            where_clause = "WHERE " + " AND ".join(filters) if filters else ""
            cursor.execute(f"""
                SELECT r.year, SUM(r.request_count) AS total
                FROM assistance_records r
                JOIN assistance_types a ON r.assistance_type_id = a.type_id
                {where_clause}
                GROUP BY r.year
                ORDER BY r.year
            """, params)
        else:
            filters.append("r.year = %s")
            params.append(int(year))
            where_clause = "WHERE " + " AND ".join(filters)
            cursor.execute(f"""
                SELECT r.month, SUM(r.request_count) AS total
                FROM assistance_records r
                JOIN assistance_types a ON r.assistance_type_id = a.type_id
                {where_clause}
                GROUP BY r.month
                ORDER BY r.month
            """, params)
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    key_field = 'year' if year == "ALL" else 'month'
    result = []
    for row in data:
        key = row[key_field]
        if key_field == 'month':
            key = MONTH_NAMES[int(key) - 1]
        result.append({key_field: key, "total": int(row['total'] or 0)})

    return jsonify(result)


@dashboard_bp.route("/api/dashboard/barchart")
@token_required
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


@dashboard_bp.route("/api/dashboard/narrative", methods=["POST"])
@token_required
def generate_narrative():
    data = request.get_json()
    kpi = data.get("kpi", {})
    trend = data.get("trend", [])
    distribution_data = data.get("distributionData", [])
    bar_data = data.get("barData", [])
    filters = data.get("filters", {})

    # --- Global KPI filters ---
    year = filters.get("year", "ALL")
    municipality = filters.get("municipality", "ALL")
    type_ = filters.get("type", "ALL")
    month = filters.get("month", "ALL")
    category = filters.get("category", "ALL")

    # --- Per-chart filters ---
    line_type = filters.get("lineType", "ALL")
    line_year = filters.get("lineYear", "ALL")
    line_category = filters.get("lineCategory", "ALL")
    distribution_year = filters.get("distributionYear", "ALL")
    distribution_month = filters.get("distributionMonth", "ALL")
    distribution_category = filters.get("distributionCategory", "ALL")
    bar_year = filters.get("barYear", "ALL")
    bar_month = filters.get("barMonth", "ALL")

    # --- Turn IDs into readable names ---
    category_name = lookup_name("category", "category_id", "category_name", category)
    type_name = lookup_name("assistance_types", "type_id", "type_name", type_)
    municipality_name = lookup_name("municipalities", "municipality_id", "municipality_name", municipality)
    line_category_name = lookup_name("category", "category_id", "category_name", line_category)
    distribution_category_name = lookup_name("category", "category_id", "category_name", distribution_category)

    # --- Line chart ---
    trend_granularity = "month" if line_year != "ALL" else "year"
    trend_summary_str = ", ".join(
        f"{row.get(trend_granularity)}: {row.get('total')} total requests"
        for row in trend
    )
    line_parts = []
    if line_category != "ALL":
        line_parts.append(f"category: {line_category_name}")
    if line_type != "ALL":
        line_parts.append(f"type: {line_type}")
    line_summary = (
        "Showing only " + ", ".join(line_parts)
        if line_parts
        else "Showing total requests across all assistance categories and types"
    )

    # --- Distribution chart ---
    distribution_summary = [{"name": p["name"], "value": p["value"]} for p in distribution_data]
    if distribution_category == "ALL":
        distribution_scope = "Bars show total requests per assistance CATEGORY"
    else:
        distribution_scope = (
            f"Bars show total requests per assistance TYPE within the category "
            f"'{distribution_category_name}'"
        )

    # --- Bar chart ---
    bar_summary = [{"municipality": b["municipality_name"], "total": b["total"]} for b in bar_data[:5]]

    # --- KPI: top item is a category only when no category/type filter is set ---
    top_label = "Category" if category == "ALL" and type_ == "ALL" else "Type"
    top_type = kpi.get("top_type", {})
    top_municipality = kpi.get("top_municipality", {})

    kpi_scope_parts = []
    if category != "ALL":
        kpi_scope_parts.append(f"category: {category_name}")
    if type_ != "ALL":
        kpi_scope_parts.append(f"type: {type_name}")
    if municipality != "ALL":
        kpi_scope_parts.append(f"municipality: {municipality_name}")
    kpi_scope = ", ".join(kpi_scope_parts) if kpi_scope_parts else "all categories, types and municipalities"

    # --- KPI period label ---
    month_name = MONTH_NAMES[int(month) - 1] if month != "ALL" else None
    if month_name and year != "ALL":
        kpi_period = f"{month_name} {year}"
    elif year != "ALL":
        kpi_period = f"the full year {year}"
    else:
        kpi_period = "the entire dataset (all years)"

    active_filters = (
        f"Global — Year: {year}, Month: {month_name or 'ALL'}, Municipality: {municipality_name}, "
        f"Category: {category_name}, Type: {type_name} | "
        f"Line Chart — Category: {line_category_name}, Type: {line_type}, Year: {line_year} | "
        f"Distribution Chart — Category: {distribution_category_name}, Year: {distribution_year}, "
        f"Month: {distribution_month} | "
        f"Bar Chart — Year: {bar_year}, Month: {bar_month}"
    )

    prompt = f"""
        You are a data analyst reporting for the Provincial Social Welfare and Development Office (PSWDO) of Bulacan.

        IMPORTANT: The KPI totals and top type/municipality below are scoped specifically to {kpi_period}
        and to {kpi_scope}.
        Your first sentence MUST explicitly name this period (e.g. "For {kpi_period}, ...").
        Never describe the KPI figures as a full-year or multi-year total unless kpi_period says so —
        the KPI numbers below are ALREADY filtered to {kpi_period} only.

        Write a comprehensive but concise narrative (5-6 sentences) covering all sections of the dashboard based on the data below.
        Do not suggest actions or recommendations. Only describe what the data shows.
        Structure your narrative: overall totals (scoped to {kpi_period}) → {trend_granularity}-over-{trend_granularity} trend (this trend panel has its own independent filters, separate from the KPI scope) → distribution → geographic breakdown
        Make sure to reflect the active filters in your narrative — if a specific category, type, year, or month is selected,
        describe only that context (e.g. "In March 2025..." rather than implying full-year totals when a month is set).
        Each chart has its own independent filters, so do not apply one chart's filters to another chart.

        - Active Filters: {active_filters}

        [KPI — scoped to {kpi_period}, {kpi_scope}]
        - Total Requests: {kpi.get('total_requests')}
        - Top Assistance {top_label}: {top_type.get('name')} ({top_type.get('total')} requests)
        - Top Municipality: {top_municipality.get('municipality_name')} ({top_municipality.get('total')} requests)

        [{trend_granularity.capitalize()}ly Trend - Line Chart]
        - Totals per {trend_granularity}: {trend_summary_str}
        - {line_summary}

        [Distribution - Bar Chart]
        - {distribution_scope}
        - Breakdown: {distribution_summary}

        [Top Municipalities - Bar Chart]
        - {bar_summary}

        Be specific with numbers and names. Keep it professional.
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


@dashboard_bp.route("/api/municipalities")
@token_required
def get_municipalities():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM municipalities ORDER BY municipality_name ASC")
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()
    return jsonify(data)


@dashboard_bp.route("/api/assistance_types")
@token_required
def get_assistance_types():
    conn = get_db()

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM assistance_types ORDER BY type_name ASC")
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()
    return jsonify(data)

@dashboard_bp.route("/api/category")
@token_required
def get_category():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM category ORDER BY category_name ASC")
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()
    return jsonify(data)

@dashboard_bp.route("/api/filtered_types")
@token_required
def get_filtered_types():
    conn = get_db()
    category = request.args.get("category","ALL")

    filters = []
    params = []
    if category != "ALL":
        filters.append("t.category_id = %s")
        params.append(int(category))
    
    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT t.type_id, t.type_name, t.category_id, c.category_name
            FROM assistance_types AS t
            JOIN category AS c ON t.category_id = c.category_id
            {where_clause}
            ORDER BY t.type_name ASC
        """, params)
        data = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()
    return jsonify(data)


@dashboard_bp.route("/api/dashboard/type-totals")
@token_required
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


@dashboard_bp.route("/api/dashboard/distribution")
@token_required
def get_distribution_data():
    category = request.args.get("category", "ALL")
    year = request.args.get("year", "ALL")
    month = request.args.get("month", "ALL")

    filters = []
    params = []

    if year != "ALL":
        filters.append("r.year = %s")
        params.append(int(year))

    if category != "ALL":
        filters.append("a.category_id = %s")
        params.append(int(category))

    if month != "ALL":
        filters.append("r.month = %s")
        params.append(month)

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)

        if category == 'ALL':
            cursor.execute(f"""
            SELECT c.category_name AS name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN category c ON a.category_id = c.category_id
            {where_clause}
            GROUP BY c.category_id
            ORDER BY total DESC

            """, params)
        else:
            cursor.execute(f"""
                SELECT a.type_name AS name, SUM(r.request_count) AS total
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

    all_types = [{"name": row["name"], "value": int(row["total"])} for row in data]

    return jsonify(all_types)