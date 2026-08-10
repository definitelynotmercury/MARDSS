from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG
from routes.monthly_import import parse_monthly_excel, ParseError
from auth_utils import token_required, admin_required
from flask import Blueprint, jsonify, request, g
from routes.irregularity_detector import detect_and_store_irregularities

upload_bp = Blueprint('upload', __name__)


def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)


@upload_bp.route('/api/admin/upload-monthly-report', methods=['POST'])
@admin_required
def upload_monthly_report():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    if not file.filename.lower().endswith('.xlsx'):
        return jsonify({"error": "File must be .xlsx"}), 400

    try:
        rows, warnings = parse_monthly_excel(file)
    except ParseError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {str(e)}"}), 400

    year_months = sorted(set((r[2], r[3]) for r in rows))

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        for year, month in year_months:
            cursor.execute(
                "DELETE FROM assistance_records WHERE year = %s AND month = %s",
                (year, month)
            )

        insert_sql = """
            INSERT INTO assistance_records
                (assistance_type_id, municipality_id, year, month, request_count)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.executemany(insert_sql, rows)
        conn.commit()
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({"error": f"Database error: {str(e)}"}), 500

    cursor.close()
    conn.close()

    for year, month in year_months:
            detect_and_store_irregularities(year, month, g.user_id)

    return jsonify({
        "message": "Upload successful",
        "rows_inserted": len(rows),
        "months_replaced": [f"{y}-{m:02d}" for y, m in year_months],
        "warnings": warnings,
    }), 200

@upload_bp.route('/api/admin/monthly-data', methods=['GET'])
@admin_required
def get_monthly_data():
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)

    if not year or not month:
        return jsonify({"error": "year and month are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT assistance_type_id, municipality_id, request_count
            FROM assistance_records
            WHERE year = %s AND month = %s
        """, (year, month))
        rows = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    return jsonify(rows), 200

@upload_bp.route('/api/admin/manual-entry', methods=['POST'])
@admin_required
def manual_entry():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    year = data.get('year')
    month = data.get('month')
    entries = data.get('entries')

    if not year or not month:
        return jsonify({"error": "year and month are required"}), 400
    if not entries or not isinstance(entries, list):
        return jsonify({"error": "entries must be a list"}), 400

    rows = [
        (e['assistance_type_id'], e['municipality_id'], year, month, e['request_count'])
        for e in entries
    ]

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM assistance_records WHERE year = %s AND month = %s",
            (year, month)
        )
        cursor.executemany("""
            INSERT INTO assistance_records
                (assistance_type_id, municipality_id, year, month, request_count)
            VALUES (%s, %s, %s, %s, %s)
        """, rows)
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

    detect_and_store_irregularities(year, month, g.user_id)

    return jsonify({
        "message": "Entry saved successfully",
        "rows_inserted": len(rows)
    }), 200

@upload_bp.route('/api/admin/delete-monthly-data', methods=['DELETE'])
@admin_required
def delete_monthly_data():
    data = request.get_json()

    year = data.get('year')
    month = data.get('month')

    if not year or not month:
        return jsonify({"error": "year and month are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM assistance_records WHERE year = %s AND month = %s",
            (year, month)
        )
        conn.commit()
        deleted = cursor.rowcount
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({
        "message": f"Deleted {deleted} records for {year}-{month:02d}"
    }), 200

