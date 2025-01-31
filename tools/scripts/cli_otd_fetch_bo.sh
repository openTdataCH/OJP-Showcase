DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

./python3 $DIR/cli_otd_fetch_csv_package.py --package_id business-organisations
./python3 $DIR/cli_otd_fetch_csv_package.py --package_id go-realtime
