import sqlite3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), 'users.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        trusted INTEGER DEFAULT 0
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Simple migration for existing databases
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN trusted INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass # Column already exists
    
    conn.commit()
    conn.close()

def is_user_trusted(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT trusted FROM users WHERE id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row is not None and row['trusted'] == 1

def set_user_trusted(user_id, trusted=1):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET trusted = ? WHERE id = ?', (trusted, user_id))
    conn.commit()
    conn.close()

def create_user(email, password):
    conn = get_db()
    cursor = conn.cursor()
    password_hash = generate_password_hash(password)
    created_at = datetime.utcnow().isoformat()
    try:
        cursor.execute(
            'INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)',
            (email, password_hash, created_at)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return user_id
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def get_user_by_email(email):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_user_by_id(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user

def save_strategy(user_id, name, code):
    conn = get_db()
    cursor = conn.cursor()
    created_at = datetime.utcnow().isoformat()
    cursor.execute(
        'INSERT INTO strategies (user_id, name, code, created_at) VALUES (?, ?, ?, ?)',
        (user_id, name, code, created_at)
    )
    conn.commit()
    strategy_id = cursor.lastrowid
    conn.close()
    return strategy_id

def get_strategies(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM strategies WHERE user_id = ? ORDER BY created_at DESC', (user_id,))
    strategies = cursor.fetchall()
    conn.close()
    return [dict(s) for s in strategies]

def delete_strategy(strategy_id, user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM strategies WHERE id = ? AND user_id = ?', (strategy_id, user_id))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

def check_password(password_hash, password):
    return check_password_hash(password_hash, password)
