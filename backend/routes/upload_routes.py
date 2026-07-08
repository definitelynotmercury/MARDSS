from flask import Blueprint, jsonify, request
import mysql.connector
from config import DB_CONFIG
from routes.monthly_import import parse_monthly_excel, ParseError

upload_bp = Blueprint('upload', __name__)


def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)


@upload_bp.route('/api/admin/upload-monthly-report', methods=['POST'])
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

    return jsonify({
        "message": "Upload successful",
        "rows_inserted": len(rows),
        "months_replaced": [f"{y}-{m:02d}" for y, m in year_months],
        "warnings": warnings,
    }), 200
