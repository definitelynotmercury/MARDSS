from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG, client

export_bp = Blueprint('export', __name__)
def get_db():
    return mysql.connector.connect(**DB_CONFIG)


@export_bp.route('/api/export/data')
def get_export_data():
    year_from = request.args.get('year_from', 'ALL')
    year_to = request.args.get('year_to', 'ALL')
    municipality = request.args.get('municipality', 'ALL')
    type_ = request.args.get('type', 'ALL')
    sections = request.args.get('sections', '').split(',')

    filters = []
    params = []

    if year_from != 'ALL' and year_to != 'ALL':
        filters.append("r.year BETWEEN %s AND %s")
        params.append(year_from)
        params.append(year_to)
    if municipality != 'ALL':
        filters.append("m.municipality_name = %s")
        params.append(municipality)
    if type_ != 'ALL':
        filters.append("a.type_name = %s")
        params.append(type_)

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    result = {}

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    if 'dashboardKpi' in sections:
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
        top_type = cursor.fetchone()

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
        top_municipality = cursor.fetchone()

        result['kpi'] = {
            "total_requests": sum_req["total"] or 0,
            "top_type": top_type or {"type_name": "N/A", "total": 0},
            "top_municipality": top_municipality or {"municipality_name": "N/A", "total": 0}
        }
    if 'dashboardTrends' in sections:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT r.year, a.type_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            {where_clause}
            GROUP BY r.year, r.assistance_type_id
            ORDER BY r.year
        """, params)
        trends = cursor.fetchall()

        result['trends'] = trends
        