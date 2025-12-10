import psycopg2
import os

try:
    conn = psycopg2.connect(
        dbname="demo-night-app",
        user="postgres",
        password="password",
        host="127.0.0.1",
        port="5433"
    )
    print("Connection successful!")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")
