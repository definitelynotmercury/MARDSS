from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.analytics import analytics_bp
from routes.forecast import forecast_bp
from routes.export import export_bp
from routes.setting import setting_bp
from routes.admin import admin_bp
from routes.upload_routes import upload_bp
import config
from routes.auth import auth_bp, mail
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})

app.config['MAIL_SERVER'] = config.MAIL_SERVER
app.config['MAIL_PORT'] = config.MAIL_PORT
app.config['MAIL_USE_TLS'] = config.MAIL_USE_TLS
app.config['MAIL_USERNAME'] = config.MAIL_USERNAME
app.config['MAIL_PASSWORD'] = config.MAIL_PASSWORD
app.config['MAIL_DEFAULT_SENDER'] = config.MAIL_DEFAULT_SENDER

mail.init_app(app)

app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(forecast_bp)
app.register_blueprint(export_bp)
app.register_blueprint(setting_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(upload_bp)

if __name__ == '__main__':
    app.run(debug=True)