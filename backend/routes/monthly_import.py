
import re
import pandas as pd

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


class ParseError(Exception):
    pass


def parse_monthly_excel(file_stream):
    """
    Parses an uploaded monthly report .xlsx (file-like object).
    Expects one sheet per month, named like 'JANUARY 2025'.
    Non-month sheets (e.g. summary tabs) are skipped automatically.

    Returns (rows, warnings) where rows is a list of
    (assistance_type_id, municipality_id, year, month, request_count) tuples.
    """
    xls = pd.ExcelFile(file_stream)
    rows = []
    warnings = []

    for sheet in xls.sheet_names:
        match = re.match(r'^([A-Z]+)\s+(\d{4})$', sheet.strip().upper())
        if not match or match.group(1) not in MONTH_MAP:
            continue  # not a month sheet, e.g. a summary tab

        month = MONTH_MAP[match.group(1)]
        year = int(match.group(2))

        df = pd.read_excel(xls, sheet_name=sheet, header=None)
        bulakan_matches = df.index[df.iloc[:, 0].astype(str).str.strip() == 'BULAKAN']
        if len(bulakan_matches) == 0:
            warnings.append(f"Sheet '{sheet}': could not find BULAKAN row, sheet skipped")
            continue
        data_start = bulakan_matches[0]

        muni_col = df.iloc[data_start:-1, 0].astype(str).str.strip().tolist()
        data = df.iloc[data_start:-1, 1:-1]  # exclude municipality name col and TOTAL col

        if data.shape[1] != len(TYPE_ORDER):
            warnings.append(
                f"Sheet '{sheet}': expected {len(TYPE_ORDER)} assistance-type columns, "
                f"found {data.shape[1]}. Sheet skipped."
            )
            continue

        for row_i, muni_name in enumerate(muni_col):
            if muni_name not in MUNICIPALITY_ID:
                warnings.append(f"Sheet '{sheet}': unknown municipality '{muni_name}', row skipped")
                continue
            mid = MUNICIPALITY_ID[muni_name]
            for col_i, type_name in enumerate(TYPE_ORDER):
                val = data.iloc[row_i, col_i]
                count = int(val) if pd.notna(val) else 0
                rows.append((ASSISTANCE_TYPE_ID[type_name], mid, year, month, count))

    if not rows:
        raise ParseError(
            "No valid month sheets found. Expected sheet names like 'JANUARY 2025'."
        )

    return rows, warnings
