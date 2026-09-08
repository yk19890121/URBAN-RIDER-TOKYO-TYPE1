import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { collections } from '../src/collections.mjs';
const root=path.resolve(import.meta.dirname,'..');
const products=JSON.parse(await fs.readFile(path.join(root,'src/products.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'src/asset-manifest.json'),'utf8'));
assert.equal(products.length,99,'Every workbook product must be present');
assert.equal(new Set(products.map(p=>p.id)).size,products.length);
for(const p of products){
  assert(collections.some(c=>c.slug===p.brand),`Unknown brand ${p.brand}`);
  assert(Number.isInteger(p.price)&&p.price>0,`Invalid price ${p.id}`);
  assert.equal(new URL(p.url).hostname,'suzuri.jp');
  assert.equal(manifest[path.basename(p.image,'.webp')].source,`Tシャツ素材/${p.name}.png`);
}
for(const [key,asset] of Object.entries(manifest)){
  if(key.startsWith('top-')) assert(asset.source.startsWith('TOP/'),`Unapproved TOP image: ${key}`);
  for(const size of ['', '-640']) await fs.access(path.join(root,'public/images',key+size+'.webp'));
}
const pages=['index.html',...collections.map(c=>`collections/${c.slug}/index.html`)];
let checkedLinks=0;
for(const page of pages){
  const file=path.join(root,'dist',page);
  const html=await fs.readFile(file,'utf8');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`${page}: must have one h1`);
  assert(!html.includes('価格未定'));
  for(const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
    let ref=match[1].split('#')[0];
    if(/^(https?:|data:)/.test(ref)) continue;
    let local=path.resolve(path.dirname(file),ref);
    if(ref.endsWith('/')) local=path.join(local,'index.html');
    await fs.access(local);
    checkedLinks++;
  }
  const slug=page.split('/')[1];
  if(slug){
    const ps=products.filter(p=>p.brand===slug);
    assert.equal((html.match(/data-product-id=/g)||[]).length,ps.length);
    for(const p of ps){
      assert(html.includes(`href="${p.url}"`),`Missing purchase URL ${p.id}`);
      assert(html.includes(`¥${p.price.toLocaleString('ja-JP')}`),`Missing price ${p.id}`);
    }
  }
}
console.log(`Verified ${pages.length} pages, ${products.length} product mappings, ${checkedLinks} local references and ${Object.keys(manifest).length} permitted source images.`);
