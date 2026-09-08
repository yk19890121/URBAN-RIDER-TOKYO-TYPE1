from pathlib import Path
from zipfile import ZipFile
import json, re, xml.etree.ElementTree as ET
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[1]
source = root / '.source'
source.mkdir(exist_ok=True)
with ZipFile('C:/Users/yhein_6x/Downloads/URBAN RIDER TOKYO-20260908T140736Z-1-001.zip') as z:
    for item in z.infolist():
        p = Path(item.filename)
        if '..' in p.parts or p.is_absolute():
            raise ValueError(item.filename)
        z.extract(item, source)
assets = source / 'URBAN RIDER TOKYO'
ns = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
book = next(assets.rglob('*.xlsx'))
with ZipFile(book) as z:
    strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        strings = [''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml'))]
    tables = {}
    for name in z.namelist():
        if re.match(r'xl/worksheets/sheet\d+.xml$', name):
            rows=[]
            for row in ET.fromstring(z.read(name)).findall('.//s:row', ns):
                vals={}
                for c in row.findall('s:c',ns):
                    v=c.find('s:v',ns)
                    value = v.text if v is not None else ''.join(c.find('s:is',ns).itertext()) if c.find('s:is',ns) is not None else ''
                    if c.get('t')=='s': value=strings[int(value)]
                    vals[c.get('r')]=value
                rows.append(vals)
            tables[name]=rows
    (source/'workbook.json').write_text(json.dumps(tables,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(tables,ensure_ascii=False)[:24000])
out=root/'output'; out.mkdir(exist_ok=True)
groups={'top':list((assets/'TOP').rglob('*.png'))}
for d in assets.iterdir():
    if d.is_dir() and ('collection' in d.name.lower()): groups[d.name]=list(d.glob('*.png'))
for group, paths in groups.items():
    paths=sorted(paths,key=lambda p:p.name)
    w=1000; cellw=166; cellh=190
    sheet=Image.new('RGB',(w,((len(paths)+5)//6)*cellh),'#ededed')
    draw=ImageDraw.Draw(sheet)
    for i,p in enumerate(paths):
        im=Image.open(p).convert('RGBA'); bg=Image.new('RGBA',im.size,'white'); bg.alpha_composite(im)
        thumb=ImageOps.contain(bg.convert('RGB'),(160,160))
        x=(i%6)*cellw;y=(i//6)*cellh
        sheet.paste(thumb,(x+(160-thumb.width)//2,y))
        draw.text((x+3,y+163),p.stem[-27:],fill='black')
    sheet.save(out/(group.replace(' ','_')+'.jpg'))
with ZipFile(next(assets.rglob('*.pptx'))) as z:
    text=[]
    for name in z.namelist():
        if re.match(r'ppt/slides/slide\d+.xml$',name):
            text.append(name+': '+ ' '.join(x.text or '' for x in ET.fromstring(z.read(name)).iter() if x.tag.endswith('}t')))
    (source/'slides.txt').write_text('\n'.join(text),encoding='utf-8')
print('Contact sheets and source data extracted.')
