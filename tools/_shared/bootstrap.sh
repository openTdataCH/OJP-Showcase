#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

CUSTOM_PYTHON_PATH=python3

if [ ! -d "$DIR/.venv" ]; then
  $CUSTOM_PYTHON_PATH -m venv $DIR/.venv
fi

source $DIR/.venv/bin/activate
pip install --upgrade pip
pip install -r $DIR/requirements.txt
