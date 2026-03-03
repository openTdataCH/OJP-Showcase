#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# from 
#   ls -al /usr/bin/python*
CUSTOM_PYTHON_PATH=/usr/bin/python3.12

if [ ! -d "$DIR/.venv" ]; then
  $CUSTOM_PYTHON -m venv $DIR/.venv
fi

source $DIR/.venv/bin/activate
pip install --upgrade pip
pip install -r $DIR/requirements.txt
