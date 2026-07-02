from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG
import bcrypt

admin_bp = Blueprint('admin', __name__)

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

@admin_bp.route('/api/admin/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_id, username, full_name, email, role FROM users")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(users)

@admin_bp.route('/api/admin/users', methods=['POST'])
def create_user():
    data = request.get_json()
    username = data.get('username')
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not all([username, full_name, email, password, role]):
        return jsonify({"error": "Missing required fields"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE username = %s OR email = %s", (username, email))
    existing_user = cursor.fetchone()
    if existing_user:
        cursor.close()
        conn.close()
        return jsonify({"error": "User with this username or email already exists"}), 409
    


    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    cursor.execute("""
        INSERT INTO users (username, full_name, email, role, password_hash)
        VALUES (%s, %s, %s, %s, %s)
    """, (username, full_name, email, role, password_hash))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "User created successfully"}), 201

@admin_bp.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()
    if not user:
        cursor.close()
        conn.close()
        return jsonify({'message': 'User not found'}), 404

    cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Account deleted successfully'}), 200
