import pandas as pd
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='ColdWaterAA07',
    database='mardss'
)
cursor = conn.cursor()

cursor.execute("SELECT type_id, type_name FROM assistance_types")
types = {row[1]: row[0] for row in cursor.fetchall()}

cursor.execute("SELECT municipality_id, municipality_name FROM municipalities")
municipalities = {row[1]: row[0] for row in cursor.fetchall()}

df = pd.read_excel(r'C:\Users\User\Documents\GitHub\MARDSS\backend\REPORT.xlsx', sheet_name='per city municipality', header=1)

columns = list(df.columns)
type_columns = [c for c in columns if str(c).strip().upper() in types]

current_municipality = None
for _, row in df.iterrows():
    first_cell = str(row.iloc[0]).strip().upper()

    if first_cell in municipalities:
        current_municipality = first_cell
        continue

    if first_cell in ['2023', '2024', '2025'] and current_municipality is not None:
        year = int(first_cell)
        muni_id = municipalities[current_municipality]

        for col in type_columns:
            type_name = str(col).strip().upper()
            type_id = types.get(type_name)
            if type_id is None:
                continue
            try:
                count = int(row[col]) if pd.notna(row[col]) else 0
            except:
                count = 0

            cursor.execute(
                "INSERT INTO assistance_records (assistance_type_id, municipality_id, year, request_count) VALUES (%s, %s, %s, %s)",
                (type_id, muni_id, year, count)
            )

conn.commit()
cursor.close()
conn.close()
print("Import done.")