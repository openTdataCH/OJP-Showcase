DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
LOGS_BASEPATH=$DIR/logs

# DATE_NOW=$(date +"%Y-%m-%d-%H%M")
DATE_NOW=$(date +"%Y-%m-%d")

BO_BASE_LOGFILE=$LOGS_BASEPATH/otd_fetch_csv_business-organisations
BO_LOGFILE=$BO_BASE_LOGFILE-$DATE_NOW.log
$DIR/python3 $DIR/cli_otd_fetch_csv_package.py --package_id business-organisations 2>&1 | tee $BO_LOGFILE

BO_LATEST_LOGFILE=$BO_BASE_LOGFILE-LATEST.log
rm -f $BO_LATEST_LOGFILE
ln -s $BO_LOGFILE $BO_LATEST_LOGFILE

GO_BASE_LOGFILE=$LOGS_BASEPATH/otd_fetch_csv_go-realtime
GO_LOGFILE=$GO_BASE_LOGFILE-$DATE_NOW.log
$DIR/python3 $DIR/cli_otd_fetch_csv_package.py --package_id go-realtime 2>&1 | tee $GO_LOGFILE

GO_LATEST_LOGFILE=$GO_BASE_LOGFILE-LATEST.log
rm -f $GO_LATEST_LOGFILE
ln -s $GO_LOGFILE $GO_LATEST_LOGFILE
