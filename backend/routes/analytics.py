from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG

analytics_bp = Blueprint('analytics',__name__)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)


@analytics_bp.route('/api/analytics/comparison')
def comparison():
    municipality_1 = request.args.get('municipality_1', 'BULAKAN')
    municipality_2 = request.args.get('municipality_2', 'HAGONOY')
    type_ = request.args.get('type', 'ALL')
    year = request.args.get('year', 'ALL')

    filters = ["(m.municipality_name = %s OR m.municipality_name = %s)"]
    params = [municipality_1, municipality_2]

    if year != 'ALL':
        filters.append("r.year = %s")
        params.append(year)

    if type_ != 'ALL':
        filters.append("a.type_name = %s")
        params.append(type_)

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




