DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
LOGS_BASEPATH=$DIR/logs

# DATE_NOW=$(date +"%Y-%m-%d-%H%M")
DATE_NOW=$(date +"%Y-%m-%d")

LOGFILE=$LOGS_BASEPATH/otd_process-gtfs-$DATE_NOW.log
./python3 $DIR/gtfs-compute-latest.py 2>&1 | tee $LOGFILE
