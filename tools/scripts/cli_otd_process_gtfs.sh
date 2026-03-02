DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# DATE_NOW=$(date +"%Y-%m-%d-%H%M")
DATE_NOW=$(date +"%Y-%m-%d")

source $DIR/common.sh
source $PYTHON_VENV_PATH/bin/activate

LOGFILE=$LOGS_BASEPATH/otd_process-gtfs-$DATE_NOW.log
python3 $DIR/gtfs-compute-latest.py 2>&1 | tee $LOGFILE
symlink_latest $LOGFILE
