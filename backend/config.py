from google import genai
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'ColdWaterAA07',
    'database': 'mardss'
}

GEMINI_API_KEY = "AIzaSyAH9DC5OFmm2W04gj1Sm7pH06hXq6mXzNI"

client = genai.Client(api_key=GEMINI_API_KEY)