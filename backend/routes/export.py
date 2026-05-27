from flask import Blueprint, jsonify, request, send_file
import mysql.connector
from config import DB_CONFIG, client
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

export_bp = Blueprint('export', __name__)
def get_db():
    return mysql.connector.connect(**DB_CONFIG)


@export_bp.route('/api/export/data')
def get_export_data():
    year_from = request.args.get('year_from', 'ALL')
    year_to = request.args.get('year_to', 'ALL')
    municipality = request.args.get('municipality', 'ALL')
    type_ = request.args.get('type', 'ALL')
    sections = request.args.get('sections', '').split(',')

    filters = []
    params = []

    if year_from != 'ALL' and year_to != 'ALL':
        filters.append("r.year BETWEEN %s AND %s")
        params.append(year_from)
        params.append(year_to)
    if municipality != 'ALL':
        filters.append("m.municipality_name = %s")
        params.append(municipality)
    if type_ != 'ALL':
        filters.append("a.type_name = %s")
        params.append(type_)

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    result = {}

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    if 'dashboardKpi' in sections:
        cursor.execute(f"""
            SELECT SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            {where_clause}
        """, params)
        sum_req = cursor.fetchone()

        cursor.execute(f"""
            SELECT a.type_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            {where_clause}
            GROUP BY r.assistance_type_id
            ORDER BY total DESC
            LIMIT 1
        """, params)
        top_type = cursor.fetchone()

        cursor.execute(f"""
            SELECT m.municipality_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            JOIN municipalities m ON r.municipality_id = m.municipality_id
            {where_clause}
            GROUP BY r.municipality_id
            ORDER BY total DESC
            LIMIT 1
        """, params)
        top_municipality = cursor.fetchone()

        result['kpi'] = {
            "total_requests": sum_req["total"] or 0,
            "top_type": top_type or {"type_name": "N/A", "total": 0},
            "top_municipality": top_municipality or {"municipality_name": "N/A", "total": 0}
        }
    if 'dashboardTrends' in sections:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT r.year, a.type_name, SUM(r.request_count) AS total
            FROM assistance_records r
            JOIN assistance_types a ON r.assistance_type_id = a.type_id
            {where_clause}
            GROUP BY r.year, r.assistance_type_id
            ORDER BY r.year
        """, params)
        trends = cursor.fetchall()

        result['trends'] = trends
        
    cursor.close()
    conn.close()        
    return jsonify(result)

@export_bp.route('/api/export/dataset')
def get_dataset():
    year_from = request.args.get('year_from', 'ALL')
    year_to = request.args.get('year_to', 'ALL')
    municipality = request.args.get('municipality', 'ALL')
    type_ = request.args.get('type', 'ALL')

    filters = []
    params = []

    if year_from != 'ALL' and year_to != 'ALL':
        filters.append("r.year BETWEEN %s AND %s")
        params.append(year_from)
        params.append(year_to)
    if municipality != 'ALL':
        filters.append("m.municipality_name = %s")
        params.append(municipality)
    if type_ != 'ALL':
        filters.append("a.type_name = %s")
        params.append(type_)

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(f"""
        SELECT r.year, m.municipality_name, a.type_name, r.request_count
        FROM assistance_records r
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        ORDER BY r.year, m.municipality_name, a.type_name
    """, params)
    data = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(data)


@export_bp.route('/api/export/dataset/excel')
def export_dataset_excel():
    year_from = request.args.get('year_from', 'ALL')
    year_to = request.args.get('year_to', 'ALL')
    municipality = request.args.get('municipality', 'ALL')
    type_ = request.args.get('type', 'ALL')

    filters = []
    params = []

    if year_from != 'ALL' and year_to != 'ALL':
        filters.append("r.year BETWEEN %s AND %s")
        params.extend([year_from, year_to])
    if municipality != 'ALL':
        filters.append("m.municipality_name = %s")
        params.append(municipality)
    if type_ != 'ALL':
        filters.append("a.type_name = %s")
        params.append(type_)

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(f"""
        SELECT r.year, m.municipality_name, a.type_name, r.request_count
        FROM assistance_records r
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        ORDER BY r.year, m.municipality_name, a.type_name
    """, params)
    data = cursor.fetchall()
    cursor.close()
    conn.close()

    # Build Excel file
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "MARDSS Dataset"

    # Title rows
    ws.merge_cells('A1:D1')
    ws['A1'] = "MARDSS REPORT — Medical Assistance Request Decision Support System"
    ws['A1'].font = Font(bold=True, size=13)
    ws['A1'].alignment = Alignment(horizontal='center')

    ws.merge_cells('A2:D2')
    ws['A2'] = f"Province of Bulacan - PSWDO | Period: {year_from} - {year_to}"
    ws['A2'].alignment = Alignment(horizontal='center')

    ws.merge_cells('A3:D3')
    muni_label = 'All Municipalities' if municipality == 'ALL' else municipality
    type_label = 'All Types' if type_ == 'ALL' else type_
    ws['A3'] = f"Municipality: {muni_label} | Assistance Type: {type_label}"
    ws['A3'].alignment = Alignment(horizontal='center')

    ws.append([])  # blank row

    # Header row
    headers = ['Year', 'Municipality', 'Assistance Type', 'Request Count']
    ws.append(headers)
    header_fill = PatternFill("solid", fgColor="1D4ED8")  # blue
    for cell in ws[5]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')

    # Data rows
    for i, row in enumerate(data):
        ws.append([row['year'], row['municipality_name'], row['type_name'], row['request_count']])
        if i % 2 == 0:
            for cell in ws[ws.max_row]:
                cell.fill = PatternFill("solid", fgColor="EFF6FF")  # light blue stripe

    # Column widths
    ws.column_dimensions['A'].width = 10
    ws.column_dimensions['B'].width = 25
    ws.column_dimensions['C'].width = 30
    ws.column_dimensions['D'].width = 15

    # Send file
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"MARDSS_{year_from}-{year_to}_{muni_label}_{type_label}.xlsx"
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )

@export_bp.route('/api/export/dataset/pdf')
def export_dataset_pdf():
    year_from = request.args.get('year_from', 'ALL')
    year_to = request.args.get('year_to', 'ALL')
    municipality = request.args.get('municipality', 'ALL')
    type_ = request.args.get('type', 'ALL')

    filters = []
    params = []

    if year_from != 'ALL' and year_to != 'ALL':
        filters.append("r.year BETWEEN %s AND %s")
        params.extend([year_from, year_to])
    if municipality != 'ALL':
        filters.append("m.municipality_name = %s")
        params.append(municipality)
    if type_ != 'ALL':
        filters.append("a.type_name = %s")
        params.append(type_)

    where_clause = "WHERE " + " AND ".join(filters) if filters else ""

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(f"""
        SELECT r.year, m.municipality_name, a.type_name, r.request_count
        FROM assistance_records r
        JOIN assistance_types a ON r.assistance_type_id = a.type_id
        JOIN municipalities m ON r.municipality_id = m.municipality_id
        {where_clause}
        ORDER BY r.year, m.municipality_name, a.type_name
    """, params)
    data = cursor.fetchall()
    cursor.close()
    conn.close()

    muni_label = 'All Municipalities' if municipality == 'ALL' else municipality
    type_label = 'All Types' if type_ == 'ALL' else type_

    # Setup
    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm
    )

    styles = getSampleStyleSheet()
    blue = colors.HexColor('#1D4ED8')
    light_blue = colors.HexColor('#EFF6FF')
    white = colors.white

    title_style = ParagraphStyle(
        'Title',
        parent=styles['Normal'],
        fontSize=15,
        fontName='Helvetica-Bold',
        textColor=white,
        alignment=TA_CENTER,
        spaceAfter=2
    )
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica',
        textColor=white,
        alignment=TA_CENTER,
        spaceAfter=2
    )

    elements = []

    # Header banner
    header_data = [[
        Paragraph("MARDSS REPORT", title_style),
    ]]
    header_table = Table(header_data, colWidths=[26*cm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), blue),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    elements.append(header_table)

    # Subtitle banner
    sub_data = [[
        Paragraph("Medical Assistance Request Decision Support System", subtitle_style),
    ],[
        Paragraph(f"Province of Bulacan - PSWDO | Period: {year_from} – {year_to}", subtitle_style),
    ],[
        Paragraph(f"Municipality: {muni_label} | Assistance Type: {type_label}", subtitle_style),
    ]]
    sub_table = Table(sub_data, colWidths=[26*cm])
    sub_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), blue),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(sub_table)
    elements.append(Spacer(1, 0.5*cm))

    # Table header + data
    col_headers = ['Year', 'Municipality', 'Assistance Type', 'Request Count']
    table_data = [col_headers] + [
        [row['year'], row['municipality_name'], row['type_name'], row['request_count']]
        for row in data
    ]

    col_widths = [4*cm, 8*cm, 10*cm, 4*cm]
    main_table = Table(table_data, colWidths=col_widths, repeatRows=1)

    row_count = len(table_data)
    style_commands = [
        # Header row
        ('BACKGROUND', (0,0), (-1,0), blue),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        # Data rows
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 9),
        ('ALIGN', (3,1), (3,-1), 'RIGHT'),
        ('TOPPADDING', (0,1), (-1,-1), 5),
        ('BOTTOMPADDING', (0,1), (-1,-1), 5),
        # Borders
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#BFDBFE')),
        ('LINEBELOW', (0,0), (-1,0), 1.5, blue),
    ]

    # Alternating row colors
    for i in range(1, row_count):
        if i % 2 == 0:
            style_commands.append(('BACKGROUND', (0,i), (-1,i), light_blue))
        else:
            style_commands.append(('BACKGROUND', (0,i), (-1,i), white))

    main_table.setStyle(TableStyle(style_commands))
    elements.append(main_table)

    doc.build(elements)
    output.seek(0)

    filename = f"MARDSS_{year_from}-{year_to}_{muni_label}_{type_label}.pdf"
    return send_file(
        output,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename
    )