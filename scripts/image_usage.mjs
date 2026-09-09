// Generates docs/image-usage.md from the source-of-truth JSON.
// Run: node scripts/image_usage.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { collections } from '../src/collections.mjs';

const root = path.resolve(import.meta.dirname, '..');
const assets = JSON.parse(await fs.readFile(path.join(root, 'src/assets.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/asset-manifest.json'), 'utf8'));
const products = JSON.parse(await fs.readFile(path.join(root, 'src/products.json'), 'utf8'));

const src = key => (manifest[key]?.source ?? '(?)').replace(/\.png$/, '');
const dim = key => manifest[key] ? `${manifest[key].width}×${manifest[key].height}` : '';
const keyOf = p => path.basename(p, '.webp');

let md = `# 画像使用マップ — URBAN RIDER TOKYO

自動生成: \`node scripts/image_usage.mjs\`（元データは \`src/assets.json\` / \`src/asset-manifest.json\` / \`src/products.json\`）
最終更新の差し替え指示: 2026-09-09

- **TOPカード**: トップページの各コレクション枠。複数枚が B04 でクロスフェード（先頭が \`data-expand\` の C02 起点）。
- **ヒーロー**: ブランドページ上部。複数枚がクロスフェード。
- **ギャラリー**: ブランドページ中程。横スクロール／画像は非トリミング（\`object-fit:contain\`）／ホバーで拡大／クリックでライトボックス。
- 配信ファイルは \`public/images/<key>.webp\`（+ \`-640.webp\`）。\`key\` は \`<slug>-<元番号>\`。

---

`;

for (const c of collections) {
  const a = assets[c.slug];
  md += `## ${c.number}. ${c.name} \`/collections/${c.slug}/\`\n\n`;

  md += `### TOPカード（${a.top.length}枚 / クロスフェード）\n\n`;
  md += `| # | key | 元ファイル | 寸法 |\n|---|---|---|---|\n`;
  a.top.forEach((p, i) => { const k = keyOf(p); md += `| ${i + 1}${i === 0 ? ' ⟵起点' : ''} | \`${k}\` | \`${src(k)}\` | ${dim(k)} |\n`; });
  md += `\n`;

  md += `### ヒーロー（${a.hero.length}枚 / クロスフェード）\n\n`;
  md += `| # | key | 元ファイル | 寸法 |\n|---|---|---|---|\n`;
  a.hero.forEach((p, i) => { const k = keyOf(p); md += `| ${i + 1} | \`${k}\` | \`${src(k)}\` | ${dim(k)} |\n`; });
  md += `\n`;

  if (a.gallery.length) {
    md += `### ギャラリー（${a.gallery.length}枚 / 横スクロール）\n\n`;
    md += `| # | key | 元ファイル | 寸法 |\n|---|---|---|---|\n`;
    a.gallery.forEach((p, i) => { const k = keyOf(p); md += `| ${i + 1} | \`${k}\` | \`${src(k)}\` | ${dim(k)} |\n`; });
    md += `\n`;
  } else {
    md += `### ギャラリー\n\nなし（ロゴ素材のみのため、タイポグラフィ構成）\n\n`;
  }

  const ps = products.filter(p => p.brand === c.slug);
  md += `### 商品（${ps.length}点）\n\n`;
  md += `| # | 表示名 | key | 元ファイル | 税込 | 購入リンク |\n|---|---|---|---|---|---|\n`;
  ps.forEach((p, i) => {
    const name = /^\d+$/.test(p.number) ? `${c.short} TEE ${p.number}` : p.number.replace('dokuro_', 'DOKURO ').replaceAll('_', ' / ');
    md += `| ${i + 1} | ${name} | \`${keyOf(p.image)}\` | \`${p.name}\` | ¥${p.price.toLocaleString('ja-JP')} | ${p.url} |\n`;
  });
  md += `\n---\n\n`;
}

md += `## 元画像フォルダ（\`.source/URBAN RIDER TOKYO/\`、Git管理外）\n\n`;
md += `| slug | フォルダ | ファイル名パターン |\n|---|---|---|\n`;
md += `| bike | \`bike_collection/\` | \`bike_collection_<n>.png\` |\n`;
md += `| gakusei | \`GAKUSEI COLLECTION/\` | \`gakusei_collection_<n>.png\` |\n`;
md += `| animal | \`ANIMAL DESIGN COLLECTION/\` | \`ANIMAL_collection_<n>.png\` |\n`;
md += `| army | \`army_collection/\` | \`army_collection_<n>.png\` |\n`;
md += `| dokuro | \`dokuro_collection/\` | \`dokuro_collection_<n>.png\` |\n`;
md += `| brand | \`URBAN RIDER TOKYO BRAND COLLECTION/\` | ロゴ 黒 / 白 |\n\n`;
md += `差し替え手順: \`scripts/remap_assets.py\` の \`PICKS\` を編集 → \`python scripts/remap_assets.py\` → \`npm run build\` → \`node scripts/image_usage.mjs\`。\n`;

await fs.mkdir(path.join(root, 'docs'), { recursive: true });
await fs.writeFile(path.join(root, 'docs/image-usage.md'), md);
console.log('wrote docs/image-usage.md');
