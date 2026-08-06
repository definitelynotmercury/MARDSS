from google import genai
from dotenv import load_dotenv
import os
import os

load_dotenv()
DB_CONFIG = {
    'host': os.environ.get("DB_HOST", "localhost"),
    'port': int(os.environ.get("DB_PORT", 3306)),
    'user': os.environ.get("DB_USER", "root"),
    'password': os.environ.get("DB_PASSWORD"),
    'database': os.environ.get("DB_NAME", "mardss"),
    'ssl_ca': os.environ.get("SSL_CA_PATH", "ca.pem"),
    'ssl_verify_cert': True,
    'ssl_disabled': False
}
SSL_CA_PATH = os.environ.get("SSL_CA_PATH", "ca.pem")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
GMAIL = os.environ.get("GMAIL")
GMAILPASS = os.environ.get("GMAILPASS")
BREVO_API_KEY = os.environ.get('BREVO_API_KEY')

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found — check your .env file")
if not JWT_SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY not found — check your .env file")
if not GMAIL:
    raise ValueError("GMAIL not found — check your .env file")
if not GMAILPASS:
    raise ValueError("GMAILPASS not found — check your .env file")

MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 587
MAIL_USE_TLS = True
MAIL_USERNAME = GMAIL
MAIL_PASSWORD = GMAILPASS
MAIL_DEFAULT_SENDER = GMAIL

client = genai.Client(api_key=GEMINI_API_KEY)