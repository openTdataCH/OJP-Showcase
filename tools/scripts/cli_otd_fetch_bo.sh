DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
LOGS_BASEPATH=$DIR/logs

DATE_NOW=$(date +"%Y-%m-%d-%H%M")

BO_LOGFILE=$LOGS_BASEPATH/otd_fetch_csv_business-organisations-$DATE_NOW.log
GO_LOGFILE=$LOGS_BASEPATH/otd_fetch_csv_go-realtime-$DATE_NOW.log

./python3 $DIR/cli_otd_fetch_csv_package.py --package_id business-organisations 2>&1 | tee $BO_LOGFILE
./python3 $DIR/cli_otd_fetch_csv_package.py --package_id go-realtime 2>&1 | tee $GO_LOGFILE
