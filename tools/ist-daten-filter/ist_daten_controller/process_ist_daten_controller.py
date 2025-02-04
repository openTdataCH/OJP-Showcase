import os
import sys
from pathlib import Path

from typing import List

import csv
import re
import shutil
import zipfile

import requests

from lxml import html

from .helpers.log_helpers import log_message

class ProcessIstDatenController:
    def __init__(self, app_config: any, filter_year: str, filter_operator_ref: str):
        log_message(f'=======================================')
        log_message(f'START extracting ist-daten')
        log_message(f'=======================================')
        log_message(f'YEAR          : {filter_year}')
        log_message(f'Operator Ref  : {filter_operator_ref}')
        log_message(f'=======================================')
        print()
        
        self.app_path = app_config['resource_paths']['app_path']
        
        self.filter_year = filter_year
        self.filter_operator_ref = filter_operator_ref
        
        self.archive_basepath = app_config['resource_paths']['ist_daten_archive_basepath']
        
        self.ist_daten_archive_url = app_config['opentransportdata']['ist_daten_archive_url']
        self.ist_daten_html_path = Path(app_config['resource_paths']['ist_daten_html_path'])
        
        output_folder_base_path = Path(app_config['resource_paths']['output_folder_base_path'])
        if not os.path.isdir(output_folder_base_path):
            os.makedirs(output_folder_base_path)
        
        filter_operator_ref_sanitised = filter_operator_ref.replace(':', '_')
        self.output_folder_base_path = Path(f'{output_folder_base_path}/{filter_year}-{filter_operator_ref_sanitised}')
        
        consolidated_csv_path = f'{self.output_folder_base_path}.csv'
        self.consolidated_csv_file = open(consolidated_csv_path, mode='w', encoding='utf-8', newline='')
        self.consolidated_csv_writer = None
        
    def process(self):
        ist_daten_year_archive_path = f'{self.archive_basepath}/{self.filter_year}'
        
        log_message('START CLEANUP prev fetched ...')
        if os.path.isdir(ist_daten_year_archive_path):
            shutil.rmtree(ist_daten_year_archive_path)
        os.makedirs(ist_daten_year_archive_path)
        log_message('... DONE')
        print()
        
        log_message('START CLEANUP prev written files ...')
        if os.path.isdir(self.output_folder_base_path):
            shutil.rmtree(self.output_folder_base_path)
        os.makedirs(self.output_folder_base_path)
        log_message('... DONE')
        print()
        
        log_message('START FETCH fetch latest HTML archive...')
        self._fetch_latest_archive_html()
        log_message(f'... saved to {self._format_app_rel_path(self.ist_daten_html_path)}')
        print()
        
        log_message('START FETCH fetch archive URLS...')
        archive_urls = self._fetch_archive_urls()
        log_message(f'... found {len(archive_urls)} items')
        print()
        
        ist_daten_archive_basepath_url = '/'.join(self.ist_daten_archive_url.split('/')[0:-1])
        
        for relative_res_url in archive_urls:
            res_url = f'{ist_daten_archive_basepath_url}/{relative_res_url}'
            
            res_url_parts = res_url.split('/')
            res_text = res_url_parts[-1]
            
            log_message(f'ARCHIVE: {res_text}')
            
            res_zip_local_path = f'{ist_daten_year_archive_path}/{res_text}'
            if not os.path.isfile(res_zip_local_path):
                log_message(f'... fetching from : {res_url}')
                response = requests.get(res_url, timeout=30, stream=True)
                response.raise_for_status()
                
                res_zip_local_file = open(res_zip_local_path, 'wb')
                for file_chunk in response.iter_content(chunk_size=65536):
                    res_zip_local_file.write(file_chunk)
                res_zip_local_file.close()
                
                log_message(f'... saved to disk')
                print()
            # fetch
            
            res_unzipped_local_path = res_zip_local_path.replace('.zip', '')
            if not os.path.isdir(res_unzipped_local_path):
                os.makedirs(res_unzipped_local_path)
                
                res_unzipped_rel_path = self._format_app_rel_path(res_unzipped_local_path)
                
                log_message(f'... unzipping to {res_unzipped_rel_path}')
                
                with zipfile.ZipFile(res_zip_local_path, 'r') as zip_ref:
                    zip_ref.extractall(res_unzipped_local_path)
                    
                log_message(f'... DONE')
                print()
            # unzip
        
            res_file_paths = Path(res_unzipped_local_path).glob("*.csv")
            res_file_paths = sorted(res_file_paths)
            
            log_message(f'  FILES: {len(res_file_paths)} files')
            print()
            
            for res_file_path in res_file_paths:
                log_message(f'  {res_file_path.name}')

                src_rows_no = _count_csv_file_rows_no(res_file_path)
                log_message(f'    read : {src_rows_no} rows')
                
                # data/ist-daten-archiv/2024/ist-daten-2024-01/2024-01-01_istdaten.csv
                file_matches = re.search(r'/([^/]+?)/([0-9]{4}-[0-9]{2}-[0-9]{2}[^\./]+?.csv)$', f'{res_file_path}'.lower())
                if file_matches is None:
                    continue
                
                res_write_file_path = Path(f'{self.output_folder_base_path}/{res_file_path.parent.name}/{res_file_path.name}')
                
                self._write_to_file(res_file_path, res_write_file_path)
                
                dst_rows_no = _count_csv_file_rows_no(res_write_file_path)
                log_message(f'    wrote: {dst_rows_no} rows')
                print()
            # loop files
            
            log_message('... cleaning-up')
            shutil.rmtree(res_unzipped_local_path)
            os.remove(res_zip_local_path)
            print()
        # loop archives
        
        self._close()
        
        log_message('... DONE processing')
        
    def _format_app_rel_path(self, path: Path):
        rel_path = f'{path}'.replace(self.app_path, '.')
        return rel_path
        
    def _fetch_latest_archive_html(self):
        log_message(f'... fetching from : {self.ist_daten_archive_url}')
        response = requests.get(self.ist_daten_archive_url, timeout=30, stream=True)
        response.raise_for_status()
        
        if not os.path.isdir(self.ist_daten_html_path.parent):
            os.makedirs(self.ist_daten_html_path.parent)
        
        ist_daten_html_path_file = open(self.ist_daten_html_path, 'wb')
        ist_daten_html_path_file.write(response.content)
        ist_daten_html_path_file.close()
    
    def _fetch_archive_urls(self):
        archive_urls: List[str] = []
        
        ist_daten_html_file = open(self.ist_daten_html_path, 'r', encoding='utf-8')
        ist_daten_html = html.parse(ist_daten_html_file)
        ist_daten_html_file.close()
        
        ist_daten_html_rows = ist_daten_html.xpath("//div[@class='entry-content']/table/tr[td]")
        for ist_daten_html_tr in ist_daten_html_rows:
            res_link_texts = ist_daten_html_tr.xpath('td/a/text()')
            if len(res_link_texts) == 0:
                print('error - whoops')
                sys.exit()
                
            res_text: str = res_link_texts[0]
            
            if f'-{self.filter_year}-' not in res_text:
                continue
            
            res_urls = ist_daten_html_tr.xpath('td/a/@href')
            if len(res_urls) == 0:
                print('error - whoops')
                sys.exit()
            
            res_url: str = res_urls[0]
            
            if not res_url.endswith('.zip'):
                print('error - expected zip')
                print(res_url)
                sys.exit()
                
            archive_urls.append(res_url)
        # loop TRs
        
        archive_urls = sorted(archive_urls)
        
        return archive_urls
    # _fetch_archive_urls
    
    def _write_to_file(self, src_path: Path, dst_path: Path):
        # if needed, mktree dirs recursively
        if not os.path.isdir(dst_path.parent):
            os.makedirs(dst_path.parent)
        
        src_path_file = open(src_path, mode='r', encoding='utf-8')
        dst_path_file = open(dst_path, mode='w', encoding='utf-8', newline='')
        
        csv_reader = csv.DictReader(src_path_file, delimiter=';')
        csv_writer = csv.DictWriter(dst_path_file, fieldnames=csv_reader.fieldnames, delimiter=';')
        csv_writer.writeheader()
        
        if self.consolidated_csv_writer is None:
            self.consolidated_csv_writer = csv.DictWriter(self.consolidated_csv_file, fieldnames=csv_reader.fieldnames, delimiter=';')
            self.consolidated_csv_writer.writeheader()
        
        for csv_row in csv_reader:
            row_operator_ref = csv_row['BETREIBER_ID']
            if row_operator_ref != self.filter_operator_ref:
                continue
            
            csv_writer.writerow(csv_row)
            self.consolidated_csv_writer.writerow(csv_row)
        # loop rows
        
        src_path_file.close()
        dst_path_file.close()
    # _write_to_file

    def _close(self):
        self.consolidated_csv_file.close()

def _count_file_rows_no(file_path: Path, start: int = 0):
    row_count = 0
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
        for row_count, _ in enumerate(file, start=start):
            pass
        
    return row_count
    
def _count_csv_file_rows_no(file_path: Path):
    return _count_file_rows_no(file_path, start=1)
