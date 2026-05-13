import jwt
import datetime
import os
from functools import wraps
from flask import request, jsonify

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")

def create_token(user_id):
    """
    Creates a JWT token for a user_id that expires in 7 days.
    """
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_token(token):
    """
    Verifies a JWT token and returns the payload or None if invalid/expired.
    """
    try:
        # If token is 'Bearer <token>', strip 'Bearer '
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def login_required(f):
    """
    Decorator to protect endpoints that require authentication.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': True, 'message': 'Token is missing'}), 401
        
        payload = verify_token(auth_header)
        if not payload:
            return jsonify({'error': True, 'message': 'Token is invalid or expired'}), 401
        
        # Add user_id to request object for easy access in endpoints
        request.user_id = payload.get('user_id')
        return f(*args, **kwargs)
    
    return decorated_function
