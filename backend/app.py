from flask import Flask, jsonify
from flask_cors import CORS
from flask import request
import mysql.connector
from config import DB_CONFIG
import bcrypt

app = Flask(__name__)
CORS(app)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

@app.route('/')
def index():
    return 'MARDSS Backend Running'

@app.route('/api/records')
def get_records():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.municipality_name, a.type_name, r.year, r.request_count
        FROM assistance_records r
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        LIMIT 20
    """)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE username = %s",(username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({'message': 'Login successful', 'role': user['role']}), 200
    else:
        return jsonify({'message': 'Invalid username or password'}), 401
@app.route('/api/municipalities')
def get_municipalities():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("select * FROM municipalities")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route("/api/assistance_types")
def get_assistance_types():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM assistance_types")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route("/api/dashboard/kpi")
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

   # Total requests
    cursor.execute(f"""
        SELECT SUM(r.request_count) AS total 
        FROM assistance_records r
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
    """, params)
    sum_req = cursor.fetchone()

    # Top type
    cursor.execute(f"""
        SELECT a.type_name, SUM(r.request_count) AS total
        FROM assistance_records r
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        GROUP BY r.assistance_type_id
        ORDER BY total DESC
        LIMIT 1
    """,params)
    highest_type = cursor.fetchone()

    # Top municipality
    cursor.execute(f"""
        SELECT m.municipality_name, SUM(r.request_count) AS total
        FROM assistance_records r
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        GROUP BY r.municipality_id
        ORDER BY total DESC
        LIMIT 1
    """,params)
    highest_municipality = cursor.fetchone()

    cursor.close()
    conn.close()

    return jsonify({
        "total_requests": sum_req["total"] or 0,
        "top_type": highest_type,
        "top_municipality": highest_municipality
    })

if __name__ == '__main__':
    app.run(debug=True)