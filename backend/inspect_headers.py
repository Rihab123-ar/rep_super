import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

file_path = Path(__file__).parent / 'data' / 'sinistres.xlsx'
print('Inspecting', file_path)
if not file_path.exists():
    raise SystemExit('File not found: ' + str(file_path))

with zipfile.ZipFile(file_path, 'r') as archive:
    names = archive.namelist()
    print('Archive contains', len(names), 'entries')
    if 'xl/sharedStrings.xml' in names:
        shared = archive.read('xl/sharedStrings.xml')
        print('sharedStrings size', len(shared))
    if 'xl/worksheets/sheet1.xml' in names:
        with archive.open('xl/worksheets/sheet1.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            first_row = root.find('.//a:sheetData/a:row', ns)
            if first_row is None:
                print('No rows found in sheet1')
            else:
                headers = []
                for c in first_row.findall('a:c', ns):
                    v = c.find('a:v', ns)
                    headers.append(v.text if v is not None else '')
                print('First row headers:', headers)
    else:
        print('sheet1.xml not found in archive')
