from flask import Blueprint, request, jsonify
import mysql.connector
from config import DB_CONFIG
import bcrypt
import os

setting_bp = Blueprint('setting', __name__)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

UPLOAD_FOLDER = 'static/profile_pics'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@setting_bp.route('/api/settings/update_profile', methods=['PUT'])
def update_profile():
    data = request.get_json()
    user_id = data.get('user_id')
    full_name = data.get('full_name')
    email = data.get('email')
    username = data.get('username')

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
def change_password():
    data = request.get_json()
    user_id = data.get('user_id')
    current_password = data.get('current_password')
    new_password = data.get('new_password')

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
def upload_picture():
    user_id = request.form.get('user_id')
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