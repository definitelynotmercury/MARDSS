"""
MARDSS monthly data importer.

Reads MONTHLY_REPORT_2023.xlsx, MONTHLY_REPORT_2024.xlsx, MONTHLY_REPORT_2025.xlsx
and reloads assistance_records at monthly granularity.

Usage:
    pip install mysql-connector-python pandas openpyxl
    python import_monthly_data.py

Edit the DB_CONFIG and FILES sections below before running.
"""

import pandas as pd
import mysql.connector

# ---- CONFIG: edit these before running ----
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'ColdWaterAA07',
    'database': 'mardss'
}

FILES = {
    2023: "MONTHLY REPORT 2023.xlsx",
    2024: "MONTHLY REPORT 2024.xlsx",
    2025: "MONTHLY REPORT 2025.xlsx",
}
# --------------------------------------------

MUNI_ORDER = [
    'BULAKAN', 'CALUMPIT', 'CITY OF MALOLOS', 'HAGONOY', 'PAOMBONG', 'PULILAN', 'BALIWAG',
    'BUSTOS', 'PLARIDEL', 'DRT', 'SAN ILDEFONSO', 'SAN MIGUEL', 'SAN RAFAEL', 'OBANDO', 'MARILAO',
    'CITY OF MEYCAUAYAN', 'BALAGTAS', 'BOCAUE', 'GUIGUINTO', 'PANDI', 'ANGAT', 'NORZAGARAY',
    'STA. MARIA', 'CSJDM',
]
MUNICIPALITY_ID = {name: i + 1 for i, name in enumerate(MUNI_ORDER)}

TYPE_ORDER = [
    'ANGIOGRAM', 'ANGIOPLASTY', 'ASSISTIVE/MEDICAL DEVICES', 'BIOPSY', 'CHEMOTHERAPY', 'CT SCAN',
    'DIALYSIS', 'DUPLEX SCAN', 'EEG', 'ENDOSCOPY/COLONOSCOPY/GASTROSCOPY', 'FISTULA CREATION',
    'FINANCIAL ASSISTANCE (MEDICAL RELATED)', 'HEARING AID', 'HOSPITAL BILL',
    'LABORATORY EXAMINATIONS', 'LASER', 'MAMMOGRAM', 'MEDICAL OPERATION', 'MEDICINES (FINANCIAL)',
    'MRI', 'NEBULIZER', 'ORTHO IMPLANT', 'OXYGEN', 'PHYSICAL THERAPY', 'SHOCKWAVE',
    'SPEECH & OCCUPATIONAL THERAPY', 'WHEELCHAIR', 'FUNERAL/ BURIAL (SPECIAL CASES)',
    'LIVELIHOOD ASSISTANCE', 'EMERGENCY BAG (DISASTER)',
]
ASSISTANCE_TYPE_ID = {name: i + 1 for i, name in enumerate(TYPE_ORDER)}

MONTH_MAP = {name: i + 1 for i, name in enumerate([
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST',
    'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
])}


def parse_files():
    """Returns a list of (assistance_type_id, municipality_id, year, month, request_count) tuples."""
    rows = []
    skipped = []

    for year, fname in FILES.items():
        xls = pd.ExcelFile(fname)
        for sheet in xls.sheet_names:
            month_name = sheet.split()[0]
            if month_name not in MONTH_MAP:
                continue  # skip non-month summary sheets
            month = MONTH_MAP[month_name]

            df = pd.read_excel(xls, sheet_name=sheet, header=None)
            # Anchor on the BULAKAN row instead of trusting header text,
            # since header cells are inconsistently formatted/corrupted across sheets.
            bulakan_matches = df.index[df.iloc[:, 0].astype(str).str.strip() == 'BULAKAN']
            if len(bulakan_matches) == 0:
                skipped.append((year, sheet))
                continue
            data_start = bulakan_matches[0]

            muni_col = df.iloc[data_start:-1, 0].astype(str).str.strip().tolist()
            data = df.iloc[data_start:-1, 1:-1]  # exclude municipality name col and TOTAL col

            for row_i, muni_name in enumerate(muni_col):
                if muni_name not in MUNICIPALITY_ID:
                    skipped.append((year, sheet, 'unknown municipality', muni_name))
                    continue
                mid = MUNICIPALITY_ID[muni_name]
                for col_i, type_name in enumerate(TYPE_ORDER):
                    val = data.iloc[row_i, col_i]
                    count = int(val) if pd.notna(val) else 0
                    rows.append((ASSISTANCE_TYPE_ID[type_name], mid, year, month, count))

    if skipped:
        print(f"WARNING: {len(skipped)} sheet(s)/row(s) skipped: {skipped}")

    return rows


def run_import(rows):
    conn = mysql.connector.connect(**DB_CONFIG)
    try:
        cur = conn.cursor()

        # Add month column if it doesn't already exist
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'assistance_records' AND COLUMN_NAME = 'month'
        """, (DB_CONFIG["database"],))
        has_month_col = cur.fetchone()[0] > 0

        if not has_month_col:
            cur.execute("ALTER TABLE assistance_records ADD COLUMN month INT NOT NULL DEFAULT 1 AFTER year")
            print("Added month column.")

        cur.execute("TRUNCATE TABLE assistance_records")
        print("Truncated assistance_records.")

        if not has_month_col:
            cur.execute("""
                ALTER TABLE assistance_records
                ADD CONSTRAINT chk_month CHECK (month BETWEEN 1 AND 12)
            """)

        insert_sql = """
            INSERT INTO assistance_records
                (assistance_type_id, municipality_id, year, month, request_count)
            VALUES (%s, %s, %s, %s, %s)
        """
        cur.executemany(insert_sql, rows)
        print(f"Inserted {cur.rowcount} rows.")

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    parsed_rows = parse_files()
    print(f"Parsed {len(parsed_rows)} rows from source files. "
          f"Total request_count sum: {sum(r[4] for r in parsed_rows)}")

    confirm = input("Proceed with TRUNCATE + import into the database? (yes/no): ")
    if confirm.strip().lower() == "yes":
        run_import(parsed_rows)
        print("Done.")
    else:
        print("Aborted, no changes made.")