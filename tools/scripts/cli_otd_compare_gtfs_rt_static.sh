set -Eeuo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

DATE_NOW=$(date +"%Y-%m-%d-%H%M")

source $DIR/common.sh

TOOL_FOLDER_PATH=$DIR/../gtfs-rt-static-compare
PYTHON_PATH=$TOOL_FOLDER_PATH/.venv/bin/python3

LOGFILE=$LOGS_BASEPATH/otd_compare_gtfs_rt_static-$DATE_NOW.log
touch "$LOGFILE"
symlink_latest $LOGFILE

DETAIL_REPORT_DATE_F=$(printf '%s\n' "$LOGFILE" | grep -Eo '[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}')
DETAIL_REPORT_URL="https://tools.opentransportdata.swiss/gtfs-rt-static-report/detail/$DETAIL_REPORT_DATE_F.json"

echo "GTFS-RT -static compare issue"
echo "Report(overview)  : https://tools.opentransportdata.swiss/gtfs-rt-static-report/"
echo "Report(by agency) : $DETAIL_REPORT_URL"
echo ""

echo "Step 1/2: running cli_compare_latest.py ..."
$PYTHON_PATH $TOOL_FOLDER_PATH/cli_compare_latest.py >>"$LOGFILE"
echo ""

echo "Step 2/2: running cli_aggregate_monthly_reports_json.py ..."
$PYTHON_PATH $TOOL_FOLDER_PATH/cli_aggregate_monthly_reports_json.py --check-errors >>"$LOGFILE"
echo ""
