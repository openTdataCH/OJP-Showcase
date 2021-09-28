set -a
source .ENV.LOCAL
set +a

SCRIPT_PATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

tool_path=$SCRIPT_PATH/../gtfs-static-fetch-latest/gtfs_static_fetch_latest_cli.py

python3 -u $tool_path \
    --gtfs-base-folder-path $GTFS_STATIC_DATA_PATH