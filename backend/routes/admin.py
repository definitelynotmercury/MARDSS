from flask import Blueprint, jsonify, request, g
import mysql.connector
from config import DB_CONFIG
import bcrypt
import os
import re
from auth_utils import token_required, admin_required

admin_bp = Blueprint('admin', __name__)

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_valid_username(username):
    pattern =  r'^[a-zA-Z0-9_]{3,20}$'
    return re.match(pattern,username) is not None

def is_valid_password(password):
    if(len(password) >= 8):
        return True
    return False

UPLOAD_FOLDER = 'static/profile_pics'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@admin_bp.route('/api/admin/users', methods=['GET'])
@admin_required
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            u.user_id, u.username, u.full_name, u.email, u.role, u.profile_picture,
            u.created_at, u.updated_at,
            creator.full_name AS created_by_name,
            editor.full_name AS updated_by_name
        FROM users u
        LEFT JOIN users creator ON u.created_by = creator.user_id
        LEFT JOIN users editor ON u.updated_by = editor.user_id
        ORDER BY u.user_id
    """)
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(users)

@admin_bp.route('/api/admin/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json()
    username = data.get('username')
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not all([username, full_name, email, password, role]):
        return jsonify({"error": "Missing required fields"}), 400

    if not is_valid_username(username):
        return jsonify({"error": "Invalid username. Must be atleast 3 characters and 20 characters long"}), 400 

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email. Must be a valid email address (e.g. name@example.com)"}), 400 

    if not is_valid_password(password):
            return jsonify({"error": "Invalid password. Must be longer than 8 characters"}), 400 
    
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
        INSERT INTO users (username, full_name, email, role, password_hash, created_by)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (username, full_name, email, role, password_hash, g.user_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "User created successfully"}), 201

@admin_bp.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    data = request.get_json()
    username = data.get('username')
    full_name = data.get('full_name')
    email = data.get('email')
    role = data.get('role')

    if not all([username, full_name, email, role]):
        return jsonify({"error": "Missing required fields"}), 400

    if not is_valid_username(username):
            return jsonify({"error": "Invalid username. Must be atleast 3 characters and 20 characters long"}), 400 
    
    if not is_valid_email(email):
        return jsonify({"error": "Invalid email. Must be a valid email address (e.g. name@example.com)"}), 400 

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()
    if not user:
        cursor.close()
        conn.close()
        return jsonify({'message': 'User not found'}), 404

    cursor.execute(
        "SELECT * FROM users WHERE (username = %s OR email = %s) AND user_id != %s",
        (username, email, user_id)
    )
    existing_user = cursor.fetchone()
    if existing_user:
        cursor.close()
        conn.close()
        return jsonify({"error": "User with this username or email already exists"}), 409

    cursor.execute("""
        UPDATE users
        SET username = %s, full_name = %s, email = %s, role = %s, updated_by = %s
        WHERE user_id = %s
    """, (username, full_name, email, role, g.user_id, user_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Account updated successfully"}), 200

@admin_bp.route('/api/admin/users/<int:user_id>/picture', methods=['POST'])
@admin_required
def upload_user_picture(user_id):
    file = request.files.get('profile_picture')

    if not file:
        return jsonify({'message': 'No file provided'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()
        return jsonify({'message': 'User not found'}), 404

    filename = f"user_{user_id}.jpg"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    cursor.execute(
        "UPDATE users SET profile_picture = %s, updated_by = %s WHERE user_id = %s",
        (filepath, g.user_id, user_id)
    )
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Profile picture updated', 'profile_picture': filepath}), 200

@admin_bp.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    
    cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()
    if not user:
        cursor.close()
        conn.close()
        return jsonify({'message': 'User not found'}), 404

    
    if user_id == g.user_id:
        cursor.close()
        conn.close()
        return jsonify({'message': 'You cannot delete your own account'}), 403

    
    cursor.execute("DELETE FROM password_reset WHERE user_id = %s", (user_id,))

   
    cursor.execute("UPDATE users SET created_by = NULL WHERE created_by = %s", (user_id,))
    cursor.execute("UPDATE users SET updated_by = NULL WHERE updated_by = %s", (user_id,))

    cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Account deleted successfully'}), 200