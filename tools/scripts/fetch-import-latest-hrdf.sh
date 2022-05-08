SCRIPT_PATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

set -a
source $SCRIPT_PATH/.ENV.LOCAL
set +a

python3 -u $SCRIPT_PATH/../hrdf-fetch-latest/hrdf_fetch_latest_cli.py \
    --hrdf-base-folder-path $HRDF_DATA_PATH

python3 -u $SCRIPT_PATH/../hrdf-db-importer/hrdf_db_import_latest_cli.py \
    --hrdf-base-folder-path $HRDF_DATA_PATH \
    --hrdf-db-base-folder-path $HRDF_DBS_PATH
