from flask import Blueprint, jsonify, request, json
import mysql.connector
from config import DB_CONFIG, JWT_SECRET_KEY
import bcrypt
import jwt
import random
import string
from datetime import datetime,timedelta,timezone
from flask_mail import Mail
from flask_mail import Message
auth_bp = Blueprint('auth', __name__)
mail = Mail()

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

@auth_bp.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data['email']

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT user_id,email from users WHERE email  = %s ", (email,))

    user = cursor.fetchone()

    if user is None:
        return jsonify({'message': 'Code has been sent in your email'}), 200

    user_id = user['user_id']
    email = user['email']

    token_code = "".join(random.choices(string.digits, k=8))

    cursor.execute("""
    INSERT INTO password_reset (user_id, token_code, expiry_time)
    VALUES (%s, %s, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
    ON DUPLICATE KEY UPDATE
    token_code = VALUES(token_code),
    expiry_time = VALUES(expiry_time);
    """,(user_id,token_code))

    conn.commit()
    cursor.close()
    conn.close()

    try:
        send_reset_code(email, token_code)
    except Exception as e:
        print(f"Email send failed: {e}")

    return jsonify({'message': 'Code has been sent in your email'}), 200


def send_reset_code(to_email, code):
    subject = "MARDDS Password Reset Code"

    text_body = f"Your MARDDS password reset code is: {code}\nThis code expires in 10 minutes."

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 480px; margin: auto; background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1a3c6e; margin-top: 0;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset your MARDDS account password. Use the code below to proceed:</p>
          <div style="text-align: center; margin: 25px 0;">
            <span style="font-size: 28px; letter-spacing: 4px; font-weight: bold; background: #eef2f8; padding: 12px 24px; border-radius: 6px; display: inline-block;">
              {code}
            </span>
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p style="color: #888; font-size: 13px;">If you did not request this, you can safely ignore this email. Do not share this code with anyone.</p>
        </div>
      </body>
    </html>
    """

    msg = Message(subject=subject, recipients=[to_email])
    msg.body = text_body
    msg.html = html_body
    mail.send(msg)