import os, psutil
from datetime import datetime

def log_message(message: str):
    memory_debug = False
    
    # 5.Oct.2021 - temporarely
    memory_debug = True

    datetime_s = datetime.today().strftime('%Y-%m-%d-%H:%M:%S')
    message = f"[{datetime_s}] - {message}"
    
    if memory_debug:
        pid = os.getpid()
        python_process = psutil.Process(pid)
        memory_use_mb = python_process.memory_info().rss / 1024 ** 2
        memory_perc = python_process.memory_percent()
        memory_message = f'MEMORY: use: {round(memory_use_mb, 1)} MB - perc: {round(memory_perc, 1)}'

        message = f'{message} - {memory_message}'
    
    print(message)