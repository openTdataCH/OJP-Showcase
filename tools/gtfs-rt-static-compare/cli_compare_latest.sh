DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

python3 $DIR/cli_compare_latest.py
python3 $DIR/cli_aggregate_monthly_reports_json.py
