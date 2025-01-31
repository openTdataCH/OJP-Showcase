DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
LOGS_BASEPATH=$DIR/logs

# DATE_NOW=$(date +"%Y-%m-%d-%H%M")
DATE_NOW=$(date +"%Y-%m-%d")

ATLAS_LOGFILE=$LOGS_BASEPATH/otd_fetch_csv_atlas-lines-$DATE_NOW.log
./python3 $DIR/cli_otd_fetch_csv_package.py --package_id slnid-line 2>&1 | tee $ATLAS_LOGFILE

ATLAS_GEOCODE_LOGFILE=$LOGS_BASEPATH/otd_geocode_atlas-lines-$DATE_NOW.log
npm --prefix ../atlas-geocode-lines/ run process_node18 2>&1 | tee $ATLAS_GEOCODE_LOGFILE
