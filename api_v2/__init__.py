import os
from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_cors import CORS
from .models import db, User, DeviceState

import numpy as np
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading', engineio_logger=True, logger=True)

# In-memory cache for the latest system state (shared between WS and REST)
latest_data = {
    'stats': {
        'energy': 0.0,
        'cost': 0.0,
        'savings': 0.0,
        'carbon': 0.0,
        'occupancy': 'unknown',
        'duration': 0
    },
    'decisions': {
        'lights': 'off',
        'ventilation': 'off',
        'heating': 'off',
        'cooling': 'off'
    },
    'activities': []
}

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///../smart_energy_v2.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-key')
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    JWTManager(app)
    socketio.init_app(app)
    Migrate(app, db)
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.status import status_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(status_bp)
    
    @app.route('/health')
    def health():
        return jsonify({"status": "healthy", "service": "Smart Energy API v2"})

    return app

# Sanitizer to handle numpy types before JSON serialization
def sanitize_for_json(obj):
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, tuple):
        return tuple(sanitize_for_json(v) for v in obj)
    elif isinstance(obj, np.ndarray):
        return sanitize_for_json(obj.tolist())
    elif isinstance(obj, (np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, (np.bool_)):
        return bool(obj)
    return obj

# Helper for emitting real-time data
def emit_system_update(data):
    """
    Transforms system data into the structure expected by the frontend:
    - stats: { energy, cost, savings, carbon, occupancy, duration }
    - decisions: { lights, ventilation, ... }
    - activities: [{ id, time, message }]
    """
    from datetime import datetime
    import time
    global latest_data
    
    # 1. Transform energy_stats into 'stats'
    energy_info = data.get('energy_stats', {})
    decisions = data.get('decisions', {})
    
    frontend_stats = {
        'energy': energy_info.get('total_energy_kwh', 0.0),
        'power': energy_info.get('average_power_watts', 0.0),
        'cost': energy_info.get('total_cost_usd', 0.0),
        'savings': energy_info.get('estimated_savings_usd', 0.0),
        'carbon': energy_info.get('carbon_footprint_kg', 0.0),
        'occupancy': decisions.get('occupancy_status', 'unknown'),
        'duration': decisions.get('duration_seconds', 0)
    }
    
    # 2. Extract activities from pose analysis
    pose = data.get('pose_analysis', {})
    if pose.get('pose_detected') and pose.get('activity_type') != 'none':
        new_activity = {
            'id': int(time.time() * 1000),
            'time': datetime.now().strftime("%H:%M:%S"),
            'message': f"Activity: {pose.get('activity_type')}",
            'type': 'system'
        }
        # Add to history (limit to 10)
        latest_data['activities'].insert(0, new_activity)
        latest_data['activities'] = latest_data['activities'][:10]
    
    # 3. Update global cache
    latest_data['stats'] = frontend_stats
    latest_data['decisions'] = decisions
    
    sanitized_data = sanitize_for_json(latest_data)
    socketio.emit('system_update', sanitized_data)
