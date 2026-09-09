"""Re-select and optimise collection artwork from the user's explicit picks.

Reads originals from .source/URBAN RIDER TOKYO/, writes WebP (+640) to public/images/,
and rewrites src/assets.json and the non-product half of src/asset-manifest.json.
Product images (product-*) are left untouched.
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.source' / 'URBAN RIDER TOKYO'
OUT = ROOT / 'public' / 'images'
OUT.mkdir(parents=True, exist_ok=True)

# --- folder + filename pattern per collection ---
FOLDER = {
    'bike':    ('bike_collection',            'bike_collection_{n}.png'),
    'gakusei': ('GAKUSEI COLLECTION',         'gakusei_collection_{n}.png'),
    'animal':  ('ANIMAL DESIGN COLLECTION',   'ANIMAL_collection_{n}.png'),
    'army':    ('army_collection',            'army_collection_{n}.png'),
    'dokuro':  ('dokuro_collection',          'dokuro_collection_{n}.png'),
}

# --- the user's picks (2026-09-09) ---
PICKS = {
    'bike':    {'top': [46, 54, 69, 43], 'hero': [1, 7, 9, 4],
               'gallery': [13, 42, 58, 67, 68, 40, 35, 34, 5]},
    'gakusei': {'top': [8, 23, 20, 5], 'hero': [4, 14, 19],
               'gallery': [1, 6, 28, 24, 11, 17, 16, 20, 22, 5]},
    'animal':  {'top': [2, 16, 11, 8], 'hero': [6, 14, 19],
               'gallery': [1, 4, 5, 7, 13, 20, 18, 17, 15]},
    'army':    {'top': [3, 2, 6], 'hero': [4, 8],
               'gallery': [8, 4, 5, 3, 7]},
    'dokuro':  {'top': [4, 7, 10], 'hero': [2, 8, 3],
               'gallery': [11, 12, 3, 4, 13, 9, 5]},
}

manifest = {}


def convert(rel_source, key, width=1400):
    src = SOURCE / rel_source
    if not src.exists():
        raise FileNotFoundError(src)
    im = Image.open(src).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    im = bg.convert('RGB')
    im.thumbnail((width, width), Image.Resampling.LANCZOS)
    (OUT / f'{key}.tmp').unlink(missing_ok=True)
    im.save(OUT / f'{key}.tmp', 'WEBP', quality=86, method=6)
    (OUT / f'{key}.tmp').replace(OUT / f'{key}.webp')
    small = im.copy()
    small.thumbnail((640, 640), Image.Resampling.LANCZOS)
    small.save(OUT / f'{key}-640.tmp', 'WEBP', quality=82, method=6)
    (OUT / f'{key}-640.tmp').replace(OUT / f'{key}-640.webp')
    manifest[key] = {'source': rel_source, 'width': im.width, 'height': im.height}
    return f'images/{key}.webp'


assets = {}
for slug, picks in PICKS.items():
    folder, pat = FOLDER[slug]
    keyset = {}  # n -> converted path (dedupe within a collection)

    def ref(n):
        if n not in keyset:
            keyset[n] = convert(f'{folder}/{pat.format(n=n)}', f'{slug}-{n}')
        return keyset[n]

    assets[slug] = {
        'top': [ref(n) for n in picks['top']],
        'hero': [ref(n) for n in picks['hero']],
        'gallery': [ref(n) for n in picks['gallery']],
    }

# --- brand: unchanged identity art, no gallery ---
assets['brand'] = {
    'top': [convert('URBAN RIDER TOKYO BRAND COLLECTION/URBAN RIDER TOKYO BRAND COLLECTION.png'
                    if (SOURCE / 'URBAN RIDER TOKYO BRAND COLLECTION/URBAN RIDER TOKYO BRAND COLLECTION.png').exists()
                    else 'TOP/ブランドオブジェクト/URBAN RIDER TOKYO BRAND COLLECTION.png',
                    'top-brand-0')],
    'hero': [
        convert('URBAN RIDER TOKYO BRAND COLLECTION/URBAN RIDER TOKYO ロゴ 黒.png', 'brand-black'),
        convert('URBAN RIDER TOKYO BRAND COLLECTION/URBAN RIDER TOKYO ロゴ 白 .png', 'brand-white'),
    ],
    'gallery': [],
}

# --- merge manifest: keep product-* entries, replace the rest ---
manifest_path = ROOT / 'src' / 'asset-manifest.json'
existing = json.loads(manifest_path.read_text(encoding='utf-8'))
merged = {k: v for k, v in existing.items() if k.startswith('product-')}
merged.update(manifest)

(ROOT / 'src' / 'assets.json').write_text(json.dumps(assets, ensure_ascii=False, indent=2), encoding='utf-8')
manifest_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding='utf-8')

# --- delete orphan images no longer referenced ---
products = json.loads((ROOT / 'src' / 'products.json').read_text(encoding='utf-8'))
referenced = set()
for group in assets.values():
    for arr in group.values():
        for p in arr:
            referenced.add(Path(p).stem)
for p in products:
    referenced.add(Path(p['image']).stem)
removed = []
for f in OUT.glob('*.webp'):
    base = f.stem[:-4] if f.stem.endswith('-640') else f.stem
    if base not in referenced:
        f.unlink()
        removed.append(f.name)

total_mb = sum(f.stat().st_size for f in OUT.iterdir()) / 1e6
print(json.dumps({
    'collections': {k: {kk: len(vv) for kk, vv in v.items()} for k, v in assets.items()},
    'converted': len(manifest),
    'orphans_removed': len(removed),
    'images_dir_MB': round(total_mb, 1),
}, ensure_ascii=False, indent=2))
