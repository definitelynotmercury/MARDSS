from google import genai
import os

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': os.environ.get("DB_PASSWORD"),
    'database': 'mardss'
}

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)