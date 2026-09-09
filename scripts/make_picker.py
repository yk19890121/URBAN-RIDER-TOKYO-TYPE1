"""Generate a self-contained HTML image picker for choosing replacement art.
Output: output/image-picker.html (git-ignored working file)."""
from pathlib import Path
import base64, io, json, html
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / '.source' / 'URBAN RIDER TOKYO'
OUT = ROOT / 'output'
OUT.mkdir(exist_ok=True)

# ---- current usage: derived live from src/assets.json + src/asset-manifest.json ----
manifest = json.loads((ROOT / 'src' / 'asset-manifest.json').read_text(encoding='utf-8'))
assets_now = json.loads((ROOT / 'src' / 'assets.json').read_text(encoding='utf-8'))
ROLE_JP = {'top': 'TOPカード', 'hero': 'ヒーロー', 'gallery': 'ギャラリー'}
usage = {}  # source-relative-path -> list of usage labels
for slug, slots in assets_now.items():
    for slot, paths in slots.items():
        for i, p in enumerate(paths):
            key = p.rsplit('/', 1)[-1].replace('.webp', '')
            source = manifest.get(key, {}).get('source')
            if source:
                usage.setdefault(source.replace('\\', '/'),
                                 []).append(f'{slug.upper()} {ROLE_JP.get(slot, slot)}{i + 1}')

# ---- folders to show ----
groups = [
    ('BIKE COLLECTION', 'bike_collection'),
    ('GAKUSEI COLLECTION', 'GAKUSEI COLLECTION'),
    ('ANIMAL DESIGN COLLECTION', 'ANIMAL DESIGN COLLECTION'),
    ('ARMY COLLECTION', 'army_collection'),
    ('DOKURO COLLECTION', 'dokuro_collection'),
]

def thumb_datauri(path, box=340):
    im = Image.open(path).convert('RGBA')
    bg = Image.new('RGBA', im.size, 'white')
    bg.alpha_composite(im)
    im = ImageOps.contain(bg.convert('RGB'), (box, box))
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=72, method=4)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

cards_html = []
total = 0
for title, folder in groups:
    d = SRC / folder
    files = sorted(d.glob('*.png'), key=lambda p: (len(p.stem), p.stem))
    items = []
    for p in files:
        rel = f'{folder}/{p.name}'
        used = usage.get(rel, [])
        badge = ''
        if used:
            badge = f'<span class="badge">{html.escape(" / ".join(used))}</span>'
        cls = 'card used' if used else 'card'
        items.append(
            f'<figure class="{cls}"><img loading="lazy" src="{thumb_datauri(p)}" alt="">'
            f'<figcaption><code>{html.escape(p.name)}</code>{badge}</figcaption></figure>'
        )
        total += 1
    used_n = sum(1 for p in files if usage.get(f'{folder}/{p.name}'))
    cards_html.append(
        f'<section><h2>{html.escape(title)} '
        f'<small>{len(files)}点中 {used_n}点 使用中</small></h2>'
        f'<div class="grid">{"".join(items)}</div></section>'
    )

page = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>URBAN RIDER TOKYO 画像ピッカー</title>
<style>
  :root{{color-scheme:light}}
  *{{box-sizing:border-box}}
  body{{margin:0;font:14px/1.6 -apple-system,"Hiragino Kaku Gothic ProN",Meiryo,sans-serif;color:#111;background:#fff;padding:32px}}
  h1{{font-size:22px;margin:0 0 4px}}
  .lead{{color:#555;max-width:60ch;margin:0 0 28px}}
  .lead b{{color:#ff302b}}
  section{{margin:0 0 40px}}
  h2{{font-size:15px;letter-spacing:.08em;border-bottom:1px solid #111;padding-bottom:6px;margin:0 0 16px}}
  h2 small{{float:right;font-weight:400;color:#888;letter-spacing:0}}
  .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px}}
  figure{{margin:0}}
  .card img{{width:100%;aspect-ratio:1/1;object-fit:contain;background:#f2f2f2;border:1px solid #e3e3e3;display:block}}
  .card.used img{{border:3px solid #ff302b}}
  figcaption{{margin-top:6px;word-break:break-all}}
  code{{font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#333}}
  .badge{{display:block;margin-top:4px;font-size:11px;font-weight:700;color:#ff302b;letter-spacing:.02em}}
  @media(max-width:600px){{body{{padding:16px}}.grid{{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}}}}
</style></head><body>
<h1>URBAN RIDER TOKYO / 画像ピッカー</h1>
<p class="lead"><b>赤枠</b>＝現在サイトで使用中の画像（キャプションに使用箇所）。使いたいファイル名（末尾の番号）を教えてください。
各コレクション＝TOPカード（3〜4枚クロスフェード）＋ブランドページのヒーロー（2〜4枚）＋ギャラリー（横スクロール5〜10枚）。
現在の割り当ては <code>docs/image-usage.md</code> 参照。商品Tシャツ画像99点は全点掲載済みのためここには含めていません。</p>
{"".join(cards_html)}
<p style="color:#888">生成: scripts/make_picker.py / 全{total}点</p>
</body></html>"""

(OUT / 'image-picker.html').write_text(page, encoding='utf-8')
print(f'wrote output/image-picker.html  ({total} images, {len(page)/1e6:.1f} MB)')
