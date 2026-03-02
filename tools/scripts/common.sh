COMMON_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

set -a

source "$COMMON_DIR/.env"
if [ -f "$COMMON_DIR/.env.local" ]; then
  source "$COMMON_DIR/.env.local"
fi

_strip_filename_yyymmdd() {
    local file="$1"
    echo "$file" | sed -E 's/(.*)-[0-9]{4}-[0-9]{2}-[0-9]{2}.*/\1/'
}

symlink_latest() {
    local file="$1"
    local file_extension="${file##*.}"
    local file_latest=$(_strip_filename_yyymmdd "$file")-LATEST."$file_extension"
    
    [ -L "$file_latest" ] && rm "$file_latest"
    ln -s "$file" "$file_latest"
}

PYTHON_VENV_PATH=$COMMON_DIR/../../python-venv
LOGS_BASEPATH=$COMMON_DIR/logs
