"""Read supplied workbook data; optimize only supplied artwork for the website."""
from pathlib import Path
import json, re
from collections import Counter
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.source' / 'URBAN RIDER TOKYO'
OUT = ROOT / 'public' / 'images'
OUT.mkdir(parents=True, exist_ok=True)
manifest = {}

def save_checked(image, destination, quality):
    if destination.exists():
        try:
            with Image.open(destination) as existing:
                existing.load()
            return
        except (OSError, ValueError):
            pass
    temporary = destination.with_suffix('.tmp')
    image.save(temporary, 'WEBP', quality=quality, method=4)
    temporary.replace(destination)

def convert(relative, target, width=1400):
    original = SOURCE / relative
    image = Image.open(original).convert('RGBA')
    image.thumbnail((width, width), Image.Resampling.LANCZOS)
    save_checked(image, OUT / (target + '.webp'), 86)
    small = image.copy()
    small.thumbnail((640,640), Image.Resampling.LANCZOS)
    save_checked(small, OUT / (target + '-640.webp'), 82)
    manifest[target] = {'source': relative, 'width': image.width, 'height': image.height}
    return 'images/' + target + '.webp'

top = {
    'bike':['背景/bike_collection_1.png','ブランドオブジェクト/bike_collection_46.png','背景/bike_collection_54.png'],
    'gakusei':['ブランドオブジェクト/gakusei_collection_15.png','背景/gakusei_collection_11.png','背景/gakusei_collection_28.png'],
    'animal':['背景/ANIMAL_collection_20.png','背景/ANIMAL_collection_14.png','ブランドオブジェクト/ANIMAL_collection_8.png'],
    'army':['ブランドオブジェクト/army_collection_6.png','背景/army_collection_5.png','背景/army_collection_8.png'],
    'dokuro':['ブランドオブジェクト/dokuro_collection_13.png','背景/dokuro_collection_6.png','背景/dokuro_collection_4.png'],
    'brand':['ブランドオブジェクト/URBAN RIDER TOKYO BRAND COLLECTION.png'],
}
visuals = {
    'bike':('bike_collection','bike_collection',[1,46,54,37,44]),
    'gakusei':('GAKUSEI COLLECTION','gakusei_collection',[4,7,27,1,21]),
    'animal':('ANIMAL DESIGN COLLECTION','ANIMAL_collection',[1,20,12,9,7]),
    'army':('army_collection','army_collection',[4,6,8,1,5]),
    'dokuro':('dokuro_collection','dokuro_collection',[1,2,6,8,12]),
}
result = {}
for slug, files in top.items():
    result[slug]={'top':[convert('TOP/'+p, f'top-{slug}-{i}') for i,p in enumerate(files)]}
for slug,(folder,prefix,nums) in visuals.items():
    result[slug]['art']=[convert(f'{folder}/{prefix}_{n}.png',f'{slug}-{n}') for n in nums]
result['brand']['art']=[convert('URBAN RIDER TOKYO BRAND COLLECTION/URBAN RIDER TOKYO ロゴ 黒.png','brand-black'),convert('URBAN RIDER TOKYO BRAND COLLECTION/URBAN RIDER TOKYO ロゴ 白 .png','brand-white')]

rows=json.loads((ROOT/'.source/workbook.json').read_text(encoding='utf-8'))['xl/worksheets/sheet1.xml']
products=[]; corrections=[]
for row in rows[1:]:
    if not row: continue
    cells={re.sub(r'\d','',k):v for k,v in row.items()}
    if not cells.get('A') or not cells.get('B'): continue
    brand=cells['A']; original=cells['B']; name=original.split('https://')[0].strip()
    if name!=original: corrections.append({'cell':next(k for k in row if k.startswith('B')),'reason':'Removed URL accidentally appended to product filename','original':original,'resolved':name})
    if 'BRAND' in brand: slug='brand'
    elif 'ANIMAL' in brand: slug='animal'
    else: slug=brand.split('_')[0].strip().lower()
    file=SOURCE/'Tシャツ素材'/(name+'.png')
    if not file.exists(): raise FileNotFoundError(file)
    id= re.search(r'_(\d{3})_',name)
    suffix=id.group(1) if id else name.replace('URBAN RIDER TOKYO_','')
    key=f'product-{len(products)+1:03d}'
    products.append({'id':key,'brand':slug,'name':name,'number':suffix,'price':int(float(cells['D'])),'url':cells['C'],'image':convert('Tシャツ素材/'+file.name,key,1000),'sourceRow':next(iter(row))[1:]})

(ROOT/'src').mkdir(exist_ok=True)
(ROOT/'src/assets.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'src/products.json').write_text(json.dumps(products,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'src/asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'src/data-corrections.json').write_text(json.dumps(corrections,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'products':len(products),'brands':dict(Counter(p['brand'] for p in products)),'corrections':corrections,'images':len(manifest),'sizeMB':round(sum(p.stat().st_size for p in OUT.iterdir())/1e6,1)},ensure_ascii=True))
