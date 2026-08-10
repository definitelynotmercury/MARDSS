from flask import Blueprint, jsonify, g
import mysql.connector
from config import DB_CONFIG
from auth_utils import token_required

notification_bp = Blueprint('notification', __name__)
def get_db():
    return mysql.connector.connect(**DB_CONFIG)

@notification_bp.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications():
    conn = get_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT notification_id, alert_type, type_name, message,
                   generated_date, is_read
            FROM notifications
            ORDER BY generated_date DESC
        """)
        rows = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    new = []
    old = []

    for row in rows:
        entry = {
            "notification_id": row['notification_id'],
            "alert_type": row['alert_type'],
            "type_name": row['type_name'],
            "message": row['message'],
            "generated_date": row['generated_date'].strftime('%b %d, %Y %I:%M %p'),
            "is_read": bool(row['is_read'])
        }
        if row['is_read']:
            old.append(entry)
        else:
            new.append(entry)

    return jsonify({
        "new": new,
        "old": old,
        "unread_count": len(new)
    }), 200


@notification_bp.route('/api/notifications/mark-read', methods=['PUT'])
@token_required
def mark_notifications_read():
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE notifications
            SET is_read = 1
            WHERE is_read = 0
        """)
        conn.commit()
        updated = cursor.rowcount
        cursor.close()
    finally:
        conn.close()

    return jsonify({
        "message": f"{updated} notifications marked as read"
    }), 200