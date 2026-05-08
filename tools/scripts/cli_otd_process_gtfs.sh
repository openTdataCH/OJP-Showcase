set -Eeuo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

DATE_NOW=$(date +"%Y-%m-%d")

source $DIR/common.sh

LOGFILE=$LOGS_BASEPATH/otd_process-gtfs-$DATE_NOW.log
PYTHON_PATH=$DIR/.venv/bin/python3

$PYTHON_PATH $DIR/gtfs-compute-latest.py 2>&1 | tee $LOGFILE
symlink_latest $LOGFILE
