# hikaru-order-form（ひかる商店 専用・凍結コピー）

MeguRee 共通版（`oshigowata-sys/order-form`）の管理画面を、ひかる商店（父親）専用に
**凍結コピー**したもの。作成：2026-06-22。

## 重要
- **データは共通版と同じ Supabase を共有**（このリポジトリにデータは無い・画面ファイルのみ）。
- **ここは原則、直接開発しない。** 共通版(order-form)の改修は、この凍結画面に影響しない設計。
- 取引先の注文フォーム・QRは共通版(order-form)を指すため、ここにはコピーしていない（刷り直し不要）。
- DBの形を変える時は **add-only**（削除・改名・型/引数変更 禁止）。共有DBなのでこの画面が壊れる。
  ルールと後方互換チェックは共通版の `db-contract/`（`コンテキスト/修正方針.md §5-A`）。

## 含まれるファイル
管理画面：login / dashboard / orders / customer / products / pricing / invoice / invoice-list /
quotation / quotation-list / settings / manual / audit-log（.html）
共通部品：auth.js / config.js / mobile.js / preview-renderer.js / mobile.css
素材：meguree ロゴ・favicon
