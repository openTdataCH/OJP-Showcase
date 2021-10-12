import sqlite3
import sys

from .log_helpers import log_message

def truncate_and_load_table_records(db_path, table_name, table_config, row_items, log_lines_no = 100000):
    db_handle = sqlite3.connect(db_path)

    drop_and_recreate_table(db_handle, table_name, table_config)

    table_column_names = fetch_column_names(db_handle, table_name)
    insert_placeholder_s = ', '.join(['?'] * len(table_column_names))
    insert_sql = f"INSERT INTO {table_name} VALUES ({insert_placeholder_s});"

    rows_total_no = len(row_items)

    row_items_groups = split_rows_in_groups(row_items, log_lines_no)
    for row_items_group in row_items_groups:
        rows_no = len(row_items_group)
        log_message(f"INSERT {rows_no} / {rows_total_no} rows ...")

        insert_cursor = db_handle.cursor()

        for row_item in row_items_group:
            row_values = []
            for column_name in table_column_names:
                row_value = None
                if column_name in row_item:
                    row_value = row_item[column_name]
                row_values.append(row_value)
            
            insert_cursor.execute(insert_sql, row_values)

        db_handle.commit()
        insert_cursor.close()

    add_table_indexes(db_handle, table_name, table_config)
    db_handle.close()

def fetch_column_names(db_handle, table_name):
    sql = f"PRAGMA table_info({table_name})"
    columns_cursor = db_handle.cursor()
    columns_cursor.execute(sql)
    columns_db_rows = columns_cursor.fetchall()
    columns_cursor.close()

    column_names = []
    for pragma_column_row in columns_db_rows:
        column_name = pragma_column_row[1]
        column_names.append(column_name)

    return column_names

def split_rows_in_groups(seq, size): 
    # https://stackoverflow.com/a/434328
    seq_gen = (seq[pos:pos + size] for pos in range(0, len(seq), size))

    return seq_gen

def drop_and_recreate_table(db_handle, table_name, table_config):
    log_message(f"... DROP TABLE {table_name} ...")
    sql = f"DROP TABLE IF EXISTS {table_name}"
    db_handle.execute(sql)

    column_defs = []
    for column_def in table_config['columns']:
        column_defs.append(column_def)

    column_defs_s = ",".join(column_defs)
    sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({column_defs_s});"
    db_handle.execute(sql)

    log_message("... DONE")

def add_table_indexes(db_handle, table_name, table_config):
    log_message(f"CREATE INDEX for table {table_name} ...")

    index_column_list = table_config.get('indexes', False) or []
    for column_name in index_column_list:
        sql = f"CREATE INDEX IF NOT EXISTS {table_name}_{column_name} ON {table_name}({column_name})"
        db_handle.execute(sql)

    log_message("... DONE DROP")

def load_sql_from_file(file_path: str):
    sql = ""
    
    sql_file = open(file_path)
    sql = sql_file.read()
    sql_file.close()

    return sql

def count_rows_table(db_handle: any, table_name: str, where_clause = ""):
    sql = f"SELECT COUNT(*) AS cno FROM {table_name} {where_clause}"
    return db_handle.cursor().execute(sql).fetchone()[0]

def table_select_rows(db_handle: any, table_name: str, where_clause = "", group_by_key = None):
    column_names = fetch_column_names(db_handle, table_name)

    column_names_s = ", ".join(column_names)
    sql = f"SELECT {column_names_s} FROM {table_name} {where_clause}"

    row_items = []

    cursor = db_handle.cursor()
    cursor.execute(sql)
    for db_row in cursor:
        db_row_dict = {}
        for column_idx, column_name in enumerate(column_names):
            db_row_dict[column_name] = db_row[column_idx]

        row_items.append(db_row_dict)
    cursor.close()

    if group_by_key:
        map_rows_by_key = {}
        for row_item in row_items:
            row_key = row_item[group_by_key]
            map_rows_by_key[row_key] = row_item
        
        return map_rows_by_key
    else:
        return row_items

def compute_db_tables_report(db_handle: any = None, db_path: any = None):
    if db_handle is None and db_path is None:
        print("ERROR, one of db_handle or db_path should be defined")
        sys.exit(1)
    
    if db_path:
        db_handle = sqlite3.connect(db_path)

    report_line_separator = "=" * 42

    report_text_lines = [
        report_line_separator,
        f"{'table'.ljust(30)}: {'count'.rjust(10)}",
        report_line_separator,
    ]

    table_names = fetch_db_table_names(db_handle, db_path)
    table_names.sort()
    
    for table_name in table_names:
        table_rows_no = count_rows_table(db_handle, table_name)
        table_rows_no_f = f"{table_rows_no:,}"
        
        report_text_line = f"{table_name.ljust(30)}: {table_rows_no_f.rjust(10)}"
        report_text_lines.append(report_text_line)

    report_text_lines.append(report_line_separator)

    print("\n".join(report_text_lines))

def fetch_db_table_names(db_handle: any = None, db_path: any = None):
    table_names = []

    sql = "SELECT name FROM sqlite_master WHERE type ='table' AND name NOT LIKE 'sqlite_%';"
    cursor = db_handle.cursor()
    cursor.execute(sql)
    for db_row in cursor:
        table_name = db_row[0]
        table_names.append(table_name)
    cursor.close()

    return table_names
    
def execute_sql_queries(db_handle: None, query_items: [str], log_lines_no = 100000):
    query_items_groups = split_rows_in_groups(query_items, log_lines_no)
    for query_items_group in query_items_groups:
        queries_no = len(query_items_group)
        log_message(f"EXECUTE {queries_no} / {len(query_items)} rows ...")

        db_cursor = db_handle.cursor()
        for query in query_items_group:
            db_cursor.execute(query)
        db_handle.commit()
        db_cursor.close()
