SCRIPT_PATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

set -a
source $SCRIPT_PATH/.ENV.LOCAL
set +a

python3 -u $SCRIPT_PATH/../gtfs-static-fetch-latest/gtfs_static_fetch_latest_cli.py \
    --gtfs-base-folder-path $GTFS_STATIC_DATA_PATH

python3 -u $SCRIPT_PATH/../gtfs-static-db-importer/gtfs_db_import_latest_cli.py \
    --gtfs-base-folder-path $GTFS_STATIC_DATA_PATH \
    --gtfs-db-base-folder-path $GTFS_STATIC_DBS_PATH
    