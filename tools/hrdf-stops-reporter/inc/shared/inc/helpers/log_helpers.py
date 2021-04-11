from datetime import datetime

def log_message(message: str):
    datetime_s = datetime.today().strftime('%Y-%m-%d-%H:%M:%S')
    message = f"[{datetime_s}] - {message}"
    print(message)