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
- `src/assets.json`：ページごとの画像選択
- `src/asset-manifest.json`：配信画像と元ファイルの対応
- `scripts/build.mjs`：7ページのHTML生成
- `public/styles.css`：レイアウト、タイポグラフィ、レスポンシブ
- `public/app.js`：メニュー、画像切替、画像拡大、商品追加表示、カーソル演出
- `blenci-selection.json`：実装したカタログIDと対象

## 商品データ

同梱Excel「URBAN RIDER TOKYO 商品ラインナップ.xlsx」の99商品を掲載。価格は同梱Excel時点の税込価格です。サイズ・在庫・決済は購入先のSUZURIで扱います。

BIKE 49点、ANIMAL 18点、GAKUSEI 16点、ARMY 5点、DOKURO 3点、BRAND 8点。商品が多いページは最初の6点を表示し、「もっと見る」で12点ずつ追加します。JavaScriptが無効な場合は全件表示します。

ExcelのB96には商品名にURLが混入していたため、URLより前を画像ファイル名として照合し、C96のURLを購入先として保持しています。変更内容は`src/data-corrections.json`に記録。元Excelは変更していません。

ARMY・DOKUROは実在する商品のみ掲載しており、6点に増やすための複製はしていません。DOKUROはロンT・ジャケット・スウェット、BRANDはTシャツ・ロンT・帽子を含みます。

## 画像と演出

TOPではTOPフォルダ由来の画像、ブランドのヒーロー・ギャラリーではそれぞれのブランドフォルダ由来の画像のみを使用しています。商品画像はTシャツ素材フォルダ由来です。ブラウザ用WebPと640px版を生成し、元素材は配信しません。

BRANDの画像素材はロゴ2点のため、タイポグラフィと白・ネイビーの面で構成。架空の写真や商品画像は追加していません。SNSアカウントやJOURNALの情報は未提供のため、架空のリンクを置かず、確認できるSUZURIストアへの導線を用意しています。

BLENCI: L03・L28、F21・F22、B04・C02・I02・I09・G05・G10・C09・U08・U09・U13・N07。I02はコレクション名の下のSVG罫線描画に適用。N07は円形に開く全画面メニュー、C02は画像の元位置からの拡大です。購入ボタンのC09は控えめな揺れに調整しています。

動きを減らすOS設定を尊重します。細かいポインターが使えない端末ではカーソル演出・近接パララックスを停止し、タップで画像を拡大できます。画像自動切替は一時停止でき、別タブ表示中・モーダル表示中は進みません。

フォントはAntonとBebas Neueを自己配信しています。SIL Open Font Licenseを`public/fonts/`に同梱しています。

## 素材の再抽出

通常の起動・ビルドに元ZIPやPythonは不要です。素材を更新する場合のみ、Pillowが利用可能なPythonで`scripts/inspect_assets.py`と`scripts/prepare_assets.py`を実行します。`inspect_assets.py`のZIPパスを環境に合わせて指定してください。元素材・検証用画像は`.source/`・`output/`に保存され、Gitから除外されます。

GitHubへのpush・サイト公開は、このローカル制作には含めていません。
