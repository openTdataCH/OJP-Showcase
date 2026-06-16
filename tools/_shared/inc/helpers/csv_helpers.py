from pathlib import Path
import csv

from collections.abc import Callable, Iterator
from typing import TypeVar

T = TypeVar('T')
CSV_RowType = dict[str, str]

def _parse_csv_row(row: CSV_RowType) -> CSV_RowType:
    return row

# generic CSV iterator
def read_csv_rows(csv_file_path: Path, delimiter: str = ',', mapper: Callable[[CSV_RowType], T] = _parse_csv_row) -> Iterator[T]:
    with csv_file_path.open('r', encoding='utf-8-sig', newline='') as file:
        reader = csv.DictReader(file, delimiter=delimiter)

        for row in reader:
            yield mapper(row)
