import subprocess

# from https://stackoverflow.com/a/27518377
def _make_gen(reader):
    b = reader(1024 * 1024)
    while b:
        yield b
        b = reader(1024*1024)

def compute_file_rows_no(file_path):
    f = open(file_path, 'rb')
    f_gen = _make_gen(f.raw.read)
    rows_no = sum( buf.count(b'\n') for buf in f_gen )
    f.close()
    
    return rows_no