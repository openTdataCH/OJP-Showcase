import argparse, os, sys, json
from pathlib import Path
from datetime import datetime
from urllib.request import Request, urlopen

from inc.shared.inc.helpers.log_helpers import log_message

ojp_api_key = '57c5dbbbf1fe4d000100001842c323fa9ff44fbba0b9b925f0c052d1'

request_url = 'https://api.opentransportdata.swiss/gtfsrt2020?FORMAT=json'
request = Request(request_url)
request.add_header('Authorization', ojp_api_key)

log_message(f'Fetching latest GTFS_RT from {request_url}')

gtfs_rt_json_s = urlopen(request).read().decode('iso-8859-1').encode('utf-8')
gtfs_rt_json = json.loads(gtfs_rt_json_s)

feed_ts = gtfs_rt_json['Header']['Timestamp']
feed_dt = datetime.fromtimestamp(feed_ts)
feed_dt_f = feed_dt.strftime("%Y-%m-%d-%H%M")

gtfs_rt_json_filename = f'GTFS_RT-{feed_dt_f}-{feed_ts}'
script_path = Path(os.path.realpath(__file__))

gtfs_rt_json_path = Path(f'{script_path.parent}/output/gtfs-rt/{gtfs_rt_json_filename}.json')
os.makedirs(gtfs_rt_json_path.parent, exist_ok=True)

gtfs_rt_json_file = open(gtfs_rt_json_path, 'w')
gtfs_rt_json_file.write(json.dumps(gtfs_rt_json, indent=4))
gtfs_rt_json_file.close()

log_message(f'... saved to {gtfs_rt_json_path}')