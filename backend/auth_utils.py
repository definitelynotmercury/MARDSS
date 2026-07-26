from flask import jsonify, request
from config import JWT_SECRET_KEY
from functools import wraps
import jwt

def token_required(func):
    @wraps(func)
    def wrapper(*args,**kwargs):

        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({'message': 'Token is missing'}), 401

        token = auth_header.split(' ')[1]

        try:
            payload = jwt.decode(token,JWT_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token is expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401

        return func(*args, **kwargs)
    return wrapper