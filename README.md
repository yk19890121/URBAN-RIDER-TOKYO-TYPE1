# URBAN RIDER TOKYO

白い余白、縦長の書体、非対称な編集レイアウトで構成したグラフィックウェアのサイトです。TOPと6コレクションページを静的HTMLとして生成します。

## 起動

Node.js 20.11以上。外部のnpm依存パッケージはありません。

```sh
npm run dev
```

http://localhost:4173 で表示します。`PORT`環境変数でポートを変更できます。

```sh
npm run build
npm run check
```

`dist/`が公開用ファイルです。任意の静的ホスティングに配置でき、サブディレクトリにも対応します。ソース変更後はビルドを再実行してください。開発サーバーを再起動しても再ビルドします。

## ページ

- `/` TOP
- `/collections/bike/` BIKE COLLECTION
- `/collections/animal/` ANIMAL DESIGN COLLECTION
- `/collections/gakusei/` GAKUSEI COLLECTION
- `/collections/army/` ARMY COLLECTION
- `/collections/dokuro/` DOKURO COLLECTION
- `/collections/brand/` URBAN RIDER TOKYO BRAND COLLECTION

## 編集箇所

- `src/collections.mjs`：コンセプト、見出し、コピー
- `src/products.json`：Excelから抽出した商品名・税込価格・SUZURI購入URL
- `src/assets.json`：ページごとの画像選択（`top` / `hero` / `gallery`）
- `src/asset-manifest.json`：配信画像と元ファイルの対応
- `scripts/remap_assets.py`：`.source/` の元PNGから画像を選び直してWebP化し、`assets.json`・`asset-manifest.json` を再生成（`PICKS` を編集）
- `scripts/image_usage.mjs`：`docs/image-usage.md`（画像使用マップ）を生成
- `scripts/make_picker.py`：`output/image-picker.html`（画像選定用の一覧）を生成
- `scripts/build.mjs`：7ページのHTML生成
- `public/styles.css`：レイアウト、タイポグラフィ、レスポンシブ
- `public/app.js`：メニュー、画像切替、ライトボックス、TOP→ブランドの円形リビール遷移、商品追加表示、カーソル演出
- `blenci-selection.json`：実装したカタログIDと対象

## 商品データ

同梱Excel「URBAN RIDER TOKYO 商品ラインナップ.xlsx」の99商品を掲載。価格は同梱Excel時点の税込価格です。サイズ・在庫・決済は購入先のSUZURIで扱います。

BIKE 49点、ANIMAL 18点、GAKUSEI 16点、ARMY 5点、DOKURO 3点、BRAND 8点。商品が多いページは最初の6点を表示し、「もっと見る」で12点ずつ追加します。JavaScriptが無効な場合は全件表示します。

ExcelのB96には商品名にURLが混入していたため、URLより前を画像ファイル名として照合し、C96のURLを購入先として保持しています。変更内容は`src/data-corrections.json`に記録。元Excelは変更していません。

ARMY・DOKUROは実在する商品のみ掲載しており、6点に増やすための複製はしていません。DOKUROはロンT・ジャケット・スウェット、BRANDはTシャツ・ロンT・帽子を含みます。

## 画像と演出

各コレクションはブランドフォルダ由来の画像を使用します（TOPカード・ヒーロー・ギャラリー）。商品画像はTシャツ素材フォルダ由来です。ブラウザ用WebPと640px版を生成し、元素材は配信しません。どの画像をどこで使っているかは `docs/image-usage.md`（`node scripts/image_usage.mjs` で再生成）。差し替えは `scripts/remap_assets.py` の `PICKS` を編集して実行します。

- TOPカード：各3〜4枚が B04 でクロスフェード。
- ヒーロー：各2〜4枚がクロスフェード。
- ギャラリー：横スクロールの帯。画像はトリミングせず（`object-fit:contain`・高さ固定）、ホバーで拡大、クリックでライトボックス。各5〜10枚。ページ全体は横スクロールしません（帯の内側だけがスクロール）。

BRANDの画像素材はロゴ2点のため、タイポグラフィと白・ネイビーの面で構成。ギャラリーは置かず、架空の写真や商品画像も追加していません。SNSアカウントやJOURNALの情報は未提供のため、架空のリンクを置かず、確認できるSUZURIストアへの導線を用意しています。

BLENCI: L03・L28、F21・F22、B04・C02・I02・I09・G05・G10・C09・U08・U09・U13・N07。I02はコレクション名の下のSVG罫線描画に適用。N07は円形に開く全画面メニューで、**TOP→ブランドページの画面遷移も同じ円形リビール**（クリック位置から広がる。旧C02の画像ズームは廃止）。C02はギャラリー・商品画像がライトボックスへ拡大する演出です。購入ボタンのC09は控えめな揺れに調整しています。改修履歴は `blenci-selection.json` の `revisions`。

動きを減らすOS設定を尊重します。細かいポインターが使えない端末ではカーソル演出・近接パララックスを停止し、タップで画像を拡大できます。画像自動切替は一時停止でき、別タブ表示中・モーダル表示中は進みません。

フォントはAntonとBebas Neueを自己配信しています。SIL Open Font Licenseを`public/fonts/`に同梱しています。

## 素材の再抽出・差し替え

通常の起動・ビルドに元ZIPやPythonは不要です（`src/*.json` と `public/images/` だけで完結）。

画像を差し替える場合のみ、Pillowが使えるPythonで作業します。元素材は `.source/URBAN RIDER TOKYO/…` に置きます（ZIP展開。`.source/`・`output/` はGit管理外）。

1. `scripts/remap_assets.py` の `PICKS`（コレクションごとの `top` / `hero` / `gallery` の番号）を編集
2. `python scripts/remap_assets.py` … WebP生成、`src/assets.json`・`src/asset-manifest.json` 更新、未使用画像の削除
3. `npm run build` でHTML再生成、`npm run check` で検証
4. `node scripts/image_usage.mjs` で `docs/image-usage.md` を更新

`scripts/inspect_assets.py` は初回の一括抽出用（ZIP→`.source/`、Excel→`.source/workbook.json`、`output/` にコンタクトシート）。旧 `scripts/prepare_assets.py` は初期構築時の全自動版で、いま実行すると `remap_assets.py` の選択を上書きするので通常は使いません。`scripts/make_picker.py` で選定用の一覧 `output/image-picker.html` を作れます。

GitHubへのpush・サイト公開は、このローカル制作には含めていません。
