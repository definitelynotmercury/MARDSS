from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': os.environ.get("DB_PASSWORD"),
    'database': 'mardss'
}

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found — check your .env file")

client = genai.Client(api_key=GEMINI_API_KEY)