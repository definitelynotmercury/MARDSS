from flask import Blueprint, request, jsonify, g
import mysql.connector
from config import DB_CONFIG
import bcrypt
import re
import os
from auth_utils import token_required

setting_bp = Blueprint('setting', __name__)

def get_db():
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

@setting_bp.route('/api/settings/update_profile', methods=['PUT'])
@token_required
def update_profile():
    data = request.get_json()
    user_id = g.user_id 
    full_name = data.get('full_name')
    email = data.get('email')
    username = data.get('username')

    
    if not is_valid_username(username):
        return jsonify({"error": "Invalid username. Must be atleast 3 characters and 20 characters long"}), 400 

    if not is_valid_email(email):
            return jsonify({"error": "Invalid email. Must be a valid email address (e.g. name@example.com)"}), 400 

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()
        return jsonify({'message': 'User not found'}), 404
    
    cursor.execute("""
        UPDATE users
        SET full_name = %s, email = %s, username = %s
        WHERE user_id = %s
    """, (full_name, email, username, user_id))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Account updated successfully'}), 200

@setting_bp.route('/api/settings/change-password', methods=['PUT'])
@token_required
def change_password():
    data = request.get_json()
    user_id = g.user_id 
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not is_valid_password(new_password):
                return jsonify({"error": "Invalid password. Must be longer than 8 characters"}), 400 

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()
        return jsonify({'message': 'User not found'}), 404

    if not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        cursor.close()
        conn.close()
        return jsonify({'message': 'Current password is incorrect'}), 401

    new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    cursor.execute("UPDATE users SET password_hash = %s WHERE user_id = %s", (new_hash, user_id))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Password changed successfully'}), 200

@setting_bp.route('/api/settings/upload-picture', methods=['POST'])
@token_required
def upload_picture():
    user_id = g.user_id 
    file = request.files.get('profile_picture')

    if not file:
        return jsonify({'message': 'No file provided'}), 400

    conn = get_db()
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

    cursor.execute("UPDATE users SET profile_picture = %s WHERE user_id = %s", (filepath, user_id))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({'message': 'Profile picture updated', 'profile_picture': filepath}), 200