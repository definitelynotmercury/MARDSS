from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.analytics import analytics_bp
from routes.forecast import forecast_bp
from routes.export import export_bp
from routes.setting import setting_bp

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})

app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(forecast_bp)
app.register_blueprint(export_bp)
app.register_blueprint(setting_bp)

if __name__ == '__main__':
    app.run(debug=True)