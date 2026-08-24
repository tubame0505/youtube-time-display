# ショート動画非表示機能 設計

日付: 2026-08-24
状態: 承認済み (ユーザー確認済み)

## 目的

YouTube 全体 (ホーム・検索・登録チャンネル・視聴ページのサイドバー) からショート動画を非表示にする。
専用の `/shorts/` ページ自体の再生は妨げない (リストアイテムのみ非表示のため)。

## 要件

- ホームのショート棚 (`ytd-rich-shelf-renderer`) をヘッダーごと非表示
- グリッド・検索結果・サイドバーに混在する個別ショートアイテムを非表示
- 新旧両マークアップに対応:
  - 新: `ytm-shorts-lockup-view-model` (2026年時点のホーム棚 DOM)
  - 旧: `a[href^="/shorts/"]`
- Tampermonkey メニュートグルで ON/OFF 切替、状態は `GM_setValue` で永続化、初期値 ON
- 既存の 100ms ポーリングループから呼び出す (商品バッジブロックと同じパターン)
- `youtube-time-display.user.js` と `youtube-time-display.js` の両ファイルに同一変更
- `@version` はバンプしない (前回 `feat: hide YouTube shopping badge` の慣例に従う)

## 設計

### 1. スタイル追加 (GM_addStyle)

```css
.yt-shorts-hidden {
  display: none !important;
}
```

商品バッジの `.yt-shopping-badge-hidden` と同じクラス付与方式。

### 2. 状態変数

```js
let isShortsHideEnabled = true; // ショート非表示の状態 (初期値)
```

### 3. `hideShorts()` 関数

100ms ポーリングループの先頭 (`updateShoppingBadgeBlock()` と並び) から呼ぶ。

ショート検出セレクタ (新旧両対応):

```js
const shortsSelector = 'ytm-shorts-lockup-view-model, a[href^="/shorts/"]';
```

アイテムコンテナ (最も近い祖先):

```js
const itemSelector =
    'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ' +
    'ytd-compact-video-renderer, yt-lockup-view-model';
```

ロジック:

1. **有効時**:
   - `document.querySelectorAll(shortsSelector)` の各要素から `closest(itemSelector)` を取得し、`.yt-shorts-hidden` を付与
   - `ytd-rich-shelf-renderer` / `ytd-item-section-renderer` のうち、配下の全アイテムがショートのみで構成されるものを、ヘッダーごと `.yt-shorts-hidden` で非表示
     - アイテムが 0 件の場合は非表示にしない (読み込み途中の誤非表示防止)
     - 判定対象のアイテムは上記 itemSelector に一致する子孫要素
2. **無効時**: 既に付与された `.yt-shorts-hidden` を全除去 (既存アイテムの復元)

### 4. トグル

`initialize()` 内に追加:

- `GM_getValue('isShortsHideEnabled', true)` で読み込み
- `GM_registerMenuCommand('ショート非表示 (ON/OFF) を切り替え', ...)` で登録
- トグル実行時は反転 → `GM_setValue` 保存 → `hideShorts()` 即時実行

既存の「時間表示」「商品表示ブロック」トグルと同一パターン。

## データフロー

```
100ms ポーリングループ
  └─ hideShorts()
        ├─ 有効: ショートアイテム/棚にクラス付与 (SPA で新要素が出ても再スキャンで対応)
        └─ 無効: 付与済みクラス除去
メニュートグル → GM_setValue 永続化 → hideShorts() 即時反映
```

## エラーハンドリング

特殊なエラー処理は不要。`querySelectorAll` は要素が無ければ空 NodeList を返すだけ。

## テスト

自動テストフレームワークなし (AGENTS.md 準拠)。手動テスト項目:

- ホームのショート棚が消える (ヘッダーごと)
- ホームグリッドに混ざる個別ショートが消える
- 検索結果のショート行・アイテムが消える
- 視聴ページサイドバーのショートが消える
- トグル OFF で全て復元、ON で再非表示
- トグル状態がページ遷移・再読み込み後も保持される
- `/shorts/` ページの再生は正常に動作する
- 通常動画は影響を受けない
