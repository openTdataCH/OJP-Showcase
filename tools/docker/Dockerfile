FROM python:3.9

WORKDIR /app

RUN pip install pyyaml psutil
RUN git clone -b develop https://github.com/openTdataCH/OJP-Showcase.git /app/OJP-Showcase
RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev