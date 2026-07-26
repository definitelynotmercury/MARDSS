from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG, JWT_SECRET_KEY
import bcrypt
import jwt
from datetime import datetime,timedelta,timezone
auth_bp = Blueprint('auth', __name__)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):

        payload = {
            'user_id': user['user_id'],
            'role' : user['role'],
            'exp' : datetime.now(timezone.utc) + timedelta(hours=8)
        }

        token = jwt.encode(payload,JWT_SECRET_KEY,algorithm='HS256')


        return jsonify({
            'message': 'Login successful',
            'user_id': user['user_id'],
            'username': user['username'],
            'full_name': user['full_name'],
            'email': user['email'],
            'role': user['role'],
            'profile_picture': user['profile_picture'],
            'token': token
        }), 200
    else:
        return jsonify({'message': 'Invalid username or password'}), 401