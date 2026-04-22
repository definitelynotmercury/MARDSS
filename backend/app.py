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

if __name__ == '__main__':
    app.run(debug=True)