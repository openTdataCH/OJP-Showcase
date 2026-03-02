#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

if [ ! -d "$DIR/.venv" ]; then
  python3 -m venv $DIR/.venv
fi

source $DIR/.venv/bin/activate
pip install --upgrade pip
pip install -r $DIR/requirements.txt
