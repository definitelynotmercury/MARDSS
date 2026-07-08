from google import genai
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'ColdWaterAA07',
    'database': 'mardss'
}

GEMINI_API_KEY = "AQ.Ab8RN6IYu7zsnLANuJySUi6RlAxQ3DFHJ19yuitBygB7hJJ6Lw"

client = genai.Client(api_key=GEMINI_API_KEY)