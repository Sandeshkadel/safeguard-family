#!/usr/bin/env python3
"""
SafeGuard Family - Enhanced Backend with Full Parent Controls
Includes extension protection, data sync, and admin features
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import uuid
import os

# Initialize Flask
app_dir = os.path.dirname(os.path.abspath(__file__))
dashboard_dir = os.path.join(app_dir, 'backend', 'safeguard_server', 'chrome-extension')
instance_dir = os.path.join('/tmp', 'instance')
os.makedirs(instance_dir, exist_ok=True)
app = Flask(__name__, instance_path=instance_dir)
app.config['SECRET_KEY'] = 'safeguard-family-secret-2026'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/safeguard.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_SORT_KEYS'] = False

db = SQLAlchemy(app)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ═══════════════════════════════════════════════════════════════
# DATABASE MODELS
# ═══════════════════════════════════════════════════════════════

class Parent(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    children = db.relationship('Child', backref='parent', lazy=True, cascade='all, delete-orphan')
    sessions = db.relationship('ParentSession', backref='parent', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class Child(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    parent_id = db.Column(db.String(50), db.ForeignKey('parent.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_banned = db.Column(db.Boolean, default=False)
    ban_reason = db.Column(db.String(255))
    
    devices = db.relationship('Device', backref='child', lazy=True, cascade='all, delete-orphan')
    block_logs = db.relationship('BlockLog', backref='child', lazy=True, cascade='all, delete-orphan')
    history_logs = db.relationship('HistoryLog', backref='child', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'parent_id': self.parent_id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_banned': self.is_banned,
            'ban_reason': self.ban_reason,
            'device_count': len(self.devices)
        }


class Device(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    child_id = db.Column(db.String(50), db.ForeignKey('child.id'), nullable=False)
    device_name = db.Column(db.String(120), nullable=False)
    device_type = db.Column(db.String(50), default='Chrome')
    last_sync = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    is_banned = db.Column(db.Boolean, default=False)
    ip_address = db.Column(db.String(50))
    
    block_logs = db.relationship('BlockLog', backref='device', lazy=True)
    history_logs = db.relationship('HistoryLog', backref='device', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'child_id': self.child_id,
            'device_name': self.device_name,
            'device_type': self.device_type,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
            'is_banned': self.is_banned,
            'ip_address': self.ip_address
        }


class BlockLog(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    child_id = db.Column(db.String(50), db.ForeignKey('child.id'), nullable=False)
    device_id = db.Column(db.String(100), db.ForeignKey('device.id'), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    domain = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    blocked_at = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(50))
    
    def to_dict(self):
        return {
            'id': self.id,
            'child_id': self.child_id,
            'device_id': self.device_id,
            'device_name': self.device.device_name if self.device else 'Unknown',
            'url': self.url,
            'domain': self.domain,
            'category': self.category,
            'blocked_at': self.blocked_at.isoformat() if self.blocked_at else None,
            'ip_address': self.ip_address
        }


class HistoryLog(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    child_id = db.Column(db.String(50), db.ForeignKey('child.id'), nullable=False)
    device_id = db.Column(db.String(100), db.ForeignKey('device.id'), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    domain = db.Column(db.String(120), nullable=False)
    page_title = db.Column(db.String(255))
    visited_at = db.Column(db.DateTime, default=datetime.utcnow)
    duration = db.Column(db.Integer, default=0)  # in seconds
    ip_address = db.Column(db.String(50))
    
    def to_dict(self):
        return {
            'id': self.id,
            'child_id': self.child_id,
            'device_id': self.device_id,
            'device_name': self.device.device_name if self.device else 'Unknown',
            'url': self.url,
            'domain': self.domain,
            'page_title': self.page_title,
            'visited_at': self.visited_at.isoformat() if self.visited_at else None,
            'duration': self.duration,
            'ip_address': self.ip_address
        }


class ParentSession(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    parent_id = db.Column(db.String(50), db.ForeignKey('parent.id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    device_name = db.Column(db.String(120))
    ip_address = db.Column(db.String(50))
    
    def is_valid(self):
        return datetime.utcnow() < self.expires_at if self.expires_at else False


class BlocklistDomain(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    child_id = db.Column(db.String(50), db.ForeignKey('child.id'), nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50))
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'child_id': self.child_id,
            'domain': self.domain,
            'category': self.category,
            'added_at': self.added_at.isoformat() if self.added_at else None
        }


class AllowlistDomain(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    child_id = db.Column(db.String(50), db.ForeignKey('child.id'), nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'child_id': self.child_id,
            'domain': self.domain,
            'added_at': self.added_at.isoformat() if self.added_at else None
        }


# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def generate_id():
    return str(uuid.uuid4())

def get_client_ip():
    return request.headers.get('X-Forwarded-For', request.remote_addr)

def verify_token(token):
    session = ParentSession.query.filter_by(token=token).first()
    if not session or not session.is_valid():
        return None
    return session.parent_id

# ═══════════════════════════════════════════════════════════════
# API ROUTES - AUTHENTICATION
# ═══════════════════════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'message': 'SafeGuard Backend is running',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

@app.route('/', methods=['GET'])
def index():
    """Serve parent dashboard on root"""
    return send_from_directory(dashboard_dir, 'dashboard.html')

@app.route('/assets/<path:filename>', methods=['GET'])
def dashboard_assets(filename):
    """Serve dashboard static assets"""
    return send_from_directory(dashboard_dir, filename)

@app.route('/api', methods=['GET'])
def api_root():
    """API root endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'SafeGuard Family API v1.0',
        'endpoints': {
            'auth': '/api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/verify',
            'children': '/api/children',
            'devices': '/api/devices',
            'blocklist': '/api/blocklist',
            'allowlist': '/api/allowlist',
            'logs': '/api/logs/history, /api/logs/blocked, /api/logs/block'
        }
    }), 200

# ═══════════════════════════════════════════════════════════════
# ERROR HANDLERS - Always return JSON
# ═══════════════════════════════════════════════════════════════

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors - return JSON instead of HTML"""
    return jsonify({
        'error': 'Not Found',
        'code': 'NOT_FOUND',
        'message': 'The requested resource does not exist',
        'status': 404
    }), 404

@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors - return JSON instead of HTML"""
    return jsonify({
        'error': 'Internal Server Error',
        'code': 'SERVER_ERROR',
        'message': 'An error occurred on the server',
        'status': 500
    }), 500

@app.errorhandler(403)
def forbidden(error):
    """Handle 403 errors - return JSON instead of HTML"""
    return jsonify({
        'error': 'Forbidden',
        'code': 'FORBIDDEN',
        'message': 'You do not have permission to access this resource',
        'status': 403
    }), 403

@app.errorhandler(401)
def unauthorized(error):
    """Handle 401 errors - return JSON instead of HTML"""
    return jsonify({
        'error': 'Unauthorized',
        'code': 'UNAUTHORIZED',
        'message': 'Authentication required',
        'status': 401
    }), 401

@app.errorhandler(400)
def bad_request(error):
    """Handle 400 errors - return JSON instead of HTML"""
    return jsonify({
        'error': 'Bad Request',
        'code': 'BAD_REQUEST',
        'message': 'Invalid request format or parameters',
        'status': 400
    }), 400

@app.route('/dashboard', methods=['GET'])
def dashboard():
    """Serve parent dashboard"""
    return send_from_directory(dashboard_dir, 'dashboard.html')

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new parent account"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required', 'code': 'INVALID_REQUEST'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        full_name = data.get('full_name', '').strip()
        
        if not email or not password:
            return jsonify({'error': 'Email and password required', 'code': 'MISSING_FIELDS'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters', 'code': 'WEAK_PASSWORD'}), 400
        
        # Check if email already exists
        if Parent.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered', 'code': 'EMAIL_EXISTS'}), 409
        
        # Create parent
        parent_id = generate_id()
        parent = Parent(
            id=parent_id,
            email=email,
            full_name=full_name
        )
        parent.set_password(password)
        
        db.session.add(parent)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'parent_id': parent_id,
            'email': parent.email,
            'full_name': parent.full_name
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {str(e)}")
        return jsonify({'error': f'Registration failed: {str(e)}', 'code': 'SERVER_ERROR'}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login parent and create session"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required', 'code': 'INVALID_REQUEST'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        device_name = data.get('device_name', 'Web Dashboard')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required', 'code': 'MISSING_FIELDS'}), 400
        
        # Find parent
        parent = Parent.query.filter_by(email=email).first()
        
        if not parent or not parent.check_password(password):
            return jsonify({'error': 'Invalid email or password', 'code': 'INVALID_CREDENTIALS'}), 401
        
        # Create session
        session_id = generate_id()
        token = generate_id()
        session = ParentSession(
            id=session_id,
            parent_id=parent.id,
            token=token,
            device_name=device_name,
            ip_address=get_client_ip(),
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        
        parent.last_login = datetime.utcnow()
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'parent_id': parent.id,
            'email': parent.email,
            'full_name': parent.full_name,
            'expires_at': session.expires_at.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Login error: {str(e)}")
        return jsonify({'error': f'Login failed: {str(e)}', 'code': 'SERVER_ERROR'}), 500


@app.route('/api/auth/verify', methods=['POST'])
def verify():
    """Verify token and return parent info"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'Token required', 'code': 'NO_TOKEN'}), 401
        
        parent_id = verify_token(token)
        if not parent_id:
            return jsonify({'error': 'Invalid or expired token', 'code': 'INVALID_TOKEN'}), 401
        
        parent = Parent.query.get(parent_id)
        if not parent:
            return jsonify({'error': 'Parent not found', 'code': 'NOT_FOUND'}), 404
        
        return jsonify({
            'success': True,
            'parent': parent.to_dict(),
            'child_count': len(parent.children)
        }), 200
        
    except Exception as e:
        print(f"Verify error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


# ═══════════════════════════════════════════════════════════════
# API ROUTES - CHILDREN
# ═══════════════════════════════════════════════════════════════

@app.route('/api/children', methods=['GET'])
def get_children():
    """Get all children for authenticated parent"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        parent_id = verify_token(token)
        if not parent_id:
            return jsonify({'error': 'Unauthorized', 'code': 'INVALID_TOKEN'}), 401
        
        children = Child.query.filter_by(parent_id=parent_id).all()
        
        return jsonify({
            'success': True,
            'children': [child.to_dict() for child in children],
            'count': len(children)
        }), 200
        
    except Exception as e:
        print(f"Get children error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


@app.route('/api/children', methods=['POST'])
def create_child():
    """Create new child profile"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        parent_id = verify_token(token)
        if not parent_id:
            return jsonify({'error': 'Unauthorized', 'code': 'INVALID_TOKEN'}), 401
        
        data = request.get_json()
        name = data.get('name', '').strip()
        
        if not name:
            return jsonify({'error': 'Child name required', 'code': 'MISSING_NAME'}), 400
        
        child_id = generate_id()
        child = Child(
            id=child_id,
            parent_id=parent_id,
            name=name
        )
        
        db.session.add(child)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Child created',
            'child_id': child.id,
            'name': child.name
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Create child error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


@app.route('/api/children/<child_id>', methods=['GET'])
def get_child(child_id):
    """Get child details with devices and logs"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        parent_id = verify_token(token)
        if not parent_id:
            return jsonify({'error': 'Unauthorized', 'code': 'INVALID_TOKEN'}), 401
        
        child = Child.query.get(child_id)
        if not child or child.parent_id != parent_id:
            return jsonify({'error': 'Child not found', 'code': 'NOT_FOUND'}), 404
        
        return jsonify({
            'success': True,
            'child': child.to_dict(),
            'devices': [d.to_dict() for d in child.devices],
            'device_count': len(child.devices),
            'total_blocks': len(child.block_logs),
            'total_visits': len(child.history_logs)
        }), 200
        
    except Exception as e:
        print(f"Get child error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


# ═══════════════════════════════════════════════════════════════
# API ROUTES - DEVICES
# ═══════════════════════════════════════════════════════════════

@app.route('/api/devices', methods=['POST'])
def register_device():
    """Register child device with extension"""
    try:
        data = request.get_json()
        
        child_id = data.get('child_id')
        device_id = data.get('device_id')
        device_name = data.get('device_name', 'Chrome Device')
        
        if not child_id or not device_id:
            return jsonify({'error': 'Child ID and Device ID required', 'code': 'MISSING_FIELDS'}), 400
        
        # Check if child exists
        child = Child.query.get(child_id)
        if not child:
            return jsonify({'error': 'Child not found', 'code': 'CHILD_NOT_FOUND'}), 404
        
        # Check if child is banned
        if child.is_banned:
            return jsonify({'error': 'Child account is banned', 'code': 'CHILD_BANNED'}), 403
        
        # Check if device already exists
        device = Device.query.get(device_id)
        if not device:
            device = Device(
                id=device_id,
                child_id=child_id,
                device_name=device_name,
                ip_address=get_client_ip()
            )
            db.session.add(device)
        else:
            device.last_sync = datetime.utcnow()
            device.device_name = device_name
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device registered',
            'device_id': device.id,
            'device_name': device.device_name,
            'status': 'active'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Register device error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


@app.route('/api/devices/<device_id>/heartbeat', methods=['POST'])
def device_heartbeat(device_id):
    """Update device last_sync timestamp (heartbeat to detect extension removal)"""
    try:
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'error': 'Device not found', 'code': 'DEVICE_NOT_FOUND'}), 404
        
        # Update last sync time
        device.last_sync = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Heartbeat received',
            'device_id': device.id,
            'last_sync': device.last_sync.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Device heartbeat error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


# ═══════════════════════════════════════════════════════════════
# API ROUTES - LOGS
# ═══════════════════════════════════════════════════════════════

@app.route('/api/logs/block', methods=['POST'])
def log_block():
    """Log blocked website"""
    try:
        data = request.get_json()
        
        child_id = data.get('child_id')
        device_id = data.get('device_id')
        url = data.get('url')
        domain = data.get('domain')
        category = data.get('category', 'Unknown')
        
        if not child_id or not device_id:
            return jsonify({'error': 'Child ID and Device ID required', 'code': 'MISSING_FIELDS'}), 400
        
        log_id = generate_id()
        log = BlockLog(
            id=log_id,
            child_id=child_id,
            device_id=device_id,
            url=url,
            domain=domain,
            category=category,
            ip_address=get_client_ip()
        )
        
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'log_id': log_id,
            'message': 'Block logged'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Log block error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


@app.route('/api/logs/history', methods=['POST'])
def log_history():
    """Log browsing history"""
    try:
        data = request.get_json()
        
        child_id = data.get('child_id')
        device_id = data.get('device_id')
        url = data.get('url')
        domain = data.get('domain')
        page_title = data.get('page_title', '')
        duration = data.get('duration', 0)
        
        if not child_id or not device_id:
            return jsonify({'error': 'Child ID and Device ID required', 'code': 'MISSING_FIELDS'}), 400
        
        log_id = generate_id()
        log = HistoryLog(
            id=log_id,
            child_id=child_id,
            device_id=device_id,
            url=url,
            domain=domain,
            page_title=page_title,
            duration=duration,
            ip_address=get_client_ip()
        )
        
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'log_id': log_id,
            'message': 'History logged'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Log history error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


@app.route('/api/logs/history/<child_id>', methods=['GET'])
def get_history(child_id):
    """Get browsing history for child"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        parent_id = verify_token(token)
        if not parent_id:
            return jsonify({'error': 'Unauthorized', 'code': 'INVALID_TOKEN'}), 401
        
        child = Child.query.get(child_id)
        if not child or child.parent_id != parent_id:
            return jsonify({'error': 'Not authorized', 'code': 'FORBIDDEN'}), 403
        
        days = request.args.get('days', 30, type=int)
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        logs = HistoryLog.query.filter(
            HistoryLog.child_id == child_id,
            HistoryLog.visited_at >= cutoff_date
        ).order_by(HistoryLog.visited_at.desc()).all()
        
        return jsonify({
            'success': True,
            'history': [log.to_dict() for log in logs],
            'count': len(logs)
        }), 200
        
    except Exception as e:
        print(f"Get history error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


@app.route('/api/logs/blocked/<child_id>', methods=['GET'])
def get_blocked_logs(child_id):
    """Get blocked websites for child"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        parent_id = verify_token(token)
        if not parent_id:
            return jsonify({'error': 'Unauthorized', 'code': 'INVALID_TOKEN'}), 401
        
        child = Child.query.get(child_id)
        if not child or child.parent_id != parent_id:
            return jsonify({'error': 'Not authorized', 'code': 'FORBIDDEN'}), 403
        
        days = request.args.get('days', 30, type=int)
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        logs = BlockLog.query.filter(
            BlockLog.child_id == child_id,
            BlockLog.blocked_at >= cutoff_date
        ).order_by(BlockLog.blocked_at.desc()).all()
        
        return jsonify({
            'success': True,
            'blocked': [log.to_dict() for log in logs],
            'count': len(logs)
        }), 200
        
    except Exception as e:
        print(f"Get blocked logs error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


# ═══════════════════════════════════════════════════════════════
# API ROUTES - BLOCKLIST / ALLOWLIST
# ═══════════════════════════════════════════════════════════════

@app.route('/api/blocklist/<child_id>', methods=['GET'])
def get_blocklist(child_id):
    """Get blocked domains for child"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        parent_id = verify_token(token)
        if not parent_id:
            return jsonify({'error': 'Unauthorized', 'code': 'INVALID_TOKEN'}), 401
        
        child = Child.query.get(child_id)
        if not child or child.parent_id != parent_id:
            return jsonify({'error': 'Not authorized', 'code': 'FORBIDDEN'}), 403
        
        domains = BlocklistDomain.query.filter_by(child_id=child_id).all()
        
        return jsonify({
            'success': True,
            'blocklist': [d.to_dict() for d in domains],
            'count': len(domains)
        }), 200
        
    except Exception as e:
        print(f"Get blocklist error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


@app.route('/api/blocklist', methods=['POST'])
def add_to_blocklist():
    """Add domain to blocklist"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        parent_id = verify_token(token)
        if not parent_id:
            return jsonify({'error': 'Unauthorized', 'code': 'INVALID_TOKEN'}), 401
        
        data = request.get_json()
        child_id = data.get('child_id')
        domain = data.get('domain', '').strip().lower()
        category = data.get('category', 'Custom')
        
        child = Child.query.get(child_id)
        if not child or child.parent_id != parent_id:
            return jsonify({'error': 'Not authorized', 'code': 'FORBIDDEN'}), 403
        
        # Check if already exists
        existing = BlocklistDomain.query.filter_by(child_id=child_id, domain=domain).first()
        if existing:
            return jsonify({'error': 'Domain already blocked', 'code': 'ALREADY_EXISTS'}), 409
        
        domain_entry = BlocklistDomain(
            id=generate_id(),
            child_id=child_id,
            domain=domain,
            category=category
        )
        
        db.session.add(domain_entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Domain blocked',
            'domain': domain,
            'category': category
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Add blocklist error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


@app.route('/api/blocklist/<domain_id>', methods=['DELETE'])
def remove_from_blocklist(domain_id):
    """Remove domain from blocklist"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        parent_id = verify_token(token)
        if not parent_id:
            return jsonify({'error': 'Unauthorized', 'code': 'INVALID_TOKEN'}), 401
        
        domain = BlocklistDomain.query.get(domain_id)
        if not domain:
            return jsonify({'error': 'Not found', 'code': 'NOT_FOUND'}), 404
        
        child = Child.query.get(domain.child_id)
        if not child or child.parent_id != parent_id:
            return jsonify({'error': 'Not authorized', 'code': 'FORBIDDEN'}), 403
        
        db.session.delete(domain)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Domain removed from blocklist'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Remove blocklist error: {str(e)}")
        return jsonify({'error': str(e), 'code': 'SERVER_ERROR'}), 500


# ═══════════════════════════════════════════════════════════════
# RUN SERVER
# ═══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("✅ Database tables created")
    
    print("\n🚀 SafeGuard Backend Server Starting...")
    print("=" * 70)
    print("📋 Server: http://192.168.1.75:3000")
    print("📊 Dashboard: http://192.168.1.75:3000/dashboard")
    print("🔧 API: http://192.168.1.75:3000/api")
    print("\n🌐 Access from ANY device on your network:")
    print("   http://192.168.1.75:3000/dashboard")
    print("=" * 70)
    print("\nPress Ctrl+C to stop the server\n")
    
    app.run(debug=True, host='0.0.0.0', port=3000, use_reloader=False)
