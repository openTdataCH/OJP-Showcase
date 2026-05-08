set -Eeuo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

DATE_NOW=$(date +"%Y-%m-%d-%H%M")

source $DIR/common.sh

TOOL_FOLDER_PATH=$DIR/../gtfs-rt-static-compare
PYTHON_PATH=$TOOL_FOLDER_PATH/.venv/bin/python3

LOGFILE=$LOGS_BASEPATH/otd_compare_gtfs_rt_static-$DATE_NOW.log
touch "$LOGFILE"

# '|| :' at end is to ignore failures
echo "Step 1/2: running cli_compare_latest.py ..."
$PYTHON_PATH $TOOL_FOLDER_PATH/cli_compare_latest.py >>"$LOGFILE" 2>>"$LOGFILE" || :
echo ""

status=0
echo "Step 2/2: running cli_aggregate_monthly_reports_json.py ..."
$PYTHON_PATH $TOOL_FOLDER_PATH/cli_aggregate_monthly_reports_json.py >>"$LOGFILE" 2>>"$LOGFILE" || status=$?
echo ""
symlink_latest $LOGFILE

DETAIL_REPORT_DATE_F=$(grep -Po 'report-\K[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}(?=\.json)' $LOGFILE)
DETAIL_REPORT_URL=https://tools.odpch.ch/gtfs-rt-static-report/detail/$DETAIL_REPORT_DATE_F

if [ "$status" -ne 0 ]; then
  {
    echo "From: $DEFAULT_MAIL_FROM"
    echo "To: $GTFS_RT_STATIC_COMPARE_MAIL_TO"
    echo "Subject: GTFS-RT -static compare issue"
    echo "Content-Type: text/plain; charset=UTF-8"
    echo
    echo "Report: https://tools.odpch.ch/gtfs-rt-static-report/"
    echo "Log: https://tools.odpch.ch/tmp/logs/otd_compare_gtfs_rt_static-LATEST.log"
    echo "Detail by agency: $DETAIL_REPORT_URL"
    echo
    echo "-> last 50 rows"
    echo
    echo " ....................................................... "
    tail -n 50 "$LOGFILE"
  } | /usr/sbin/sendmail -t
  exit "$status"
fi
