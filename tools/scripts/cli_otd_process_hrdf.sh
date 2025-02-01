DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
LOGS_BASEPATH=$DIR/logs

# DATE_NOW=$(date +"%Y-%m-%d-%H%M")
DATE_NOW=$(date +"%Y-%m-%d")

BASE_LOGFILE=$LOGS_BASEPATH/otd_process-hrdf
LOGFILE=$BASE_LOGFILE-$DATE_NOW.log
$DIR/python3 $DIR/hrdf-compute-latest.py 2>&1 | tee $LOGFILE

LATEST_LOGFILE=$BASE_LOGFILE-LATEST.log
rm -f $LATEST_LOGFILE
ln -s $LOGFILE $LATEST_LOGFILE
