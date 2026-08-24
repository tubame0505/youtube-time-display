# ショート動画非表示機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** YouTube 全体 (ホーム・検索・登録・サイドバー) のショート動画を、既存パターンに沿ったメニュートグル付きで非表示にする。

**Architecture:** 既存の 100ms ポーリングループから呼ぶ `hideShorts()` を追加。新旧両マークアップ (`ytm-shorts-lockup-view-model` / `a[href^="/shorts/"]`) をスキャンし、ショートを含むアイテムを `.yt-shorts-hidden` クラスで非表示。ショートのみの棚・セクションはヘッダーごと非表示。トグルは `GM_registerMenuCommand` + `GM_setValue` で永続化。

**Tech Stack:** 素の JavaScript (userscript / Tampermonkey)。ビルド・テストフレームワークなし。

## Global Constraints

- `youtube-time-display.user.js` と `youtube-time-display.js` は **常に同一内容** を保つ — すべての変更を両ファイルに適用する
- インデントは 4 スペース、`const`/`let`、camelCase、単一 IIFE + `'use strict'` の既存スタイルに従う
- コメントは日本語 (既存ファイルに合わせる)
- `@version` はバンプしない (既存慣例)
- `@grant` / `@match` は変更しない (新規権限不要)
- 自動テストフレームワークなし → 検証は `node --check` + ブラウザ E2E + 手動テスト
- 既存の 100ms ポーリングパターン (商品バッジブロック) を再利用し、MutationObserver 等の新方式を導入しない

---

### Task 1: CSS クラス・状態変数・hideShorts() 関数の追加

**Files:**
- Modify: `youtube-time-display.user.js` (CSS ブロック ~L47、状態変数 ~L85、関数追加 ~L125)
- Modify: `youtube-time-display.js` (同一内容)

**Interfaces:**
- Consumes: なし (既存ファイルのみ)
- Produces: グローバル状態 `isShortsHideEnabled: boolean`、関数 `hideShorts(): void`、CSS クラス `.yt-shorts-hidden` — Task 2 が使用

- [ ] **Step 1: 両ファイルの GM_addStyle に `.yt-shorts-hidden` を追加**

`GM_addStyle(\`...\`)` テンプレート内、`.yt-shopping-badge-hidden` ブロックの後に追記:

```css
        .yt-shopping-badge-hidden {
          display: none !important;
        }

        .yt-shorts-hidden {
          display: none !important;
        }
```

- [ ] **Step 2: 状態変数を追加**

`let isShoppingBadgeBlockEnabled = true; // 商品表示ブロックの状態 (初期値)` の直後に:

```js
    let isShortsHideEnabled = true; // ショート非表示の状態 (初期値)
```

- [ ] **Step 3: `updateShoppingBadgeBlock()` の直後 (「// 監視ループ (SPA対応)」の前) に関数を追加**

```js
    /**
     * YouTube全体のショート動画を非表示にする
     * 新旧両マークアップ (ytm-shorts-lockup-view-model / a[href^="/shorts/"]) に対応
     */
    function hideShorts() {
        const shortsSelector = 'ytm-shorts-lockup-view-model, a[href^="/shorts/"]';
        const itemSelector = [
            'ytd-rich-item-renderer',
            'ytd-video-renderer',
            'ytd-grid-video-renderer',
            'ytd-compact-video-renderer',
            'yt-lockup-view-model'
        ].join(',');
        const containerSelector = 'ytd-rich-shelf-renderer, ytd-item-section-renderer';
        const HIDE_CLASS = 'yt-shorts-hidden';

        if (!isShortsHideEnabled) {
            // 無効時: 付与済みクラスを全除去して復元
            document.querySelectorAll(`.${HIDE_CLASS}`).forEach((el) => {
                el.classList.remove(HIDE_CLASS);
            });
            return;
        }

        // 1. 個別ショートアイテムを非表示
        document.querySelectorAll(shortsSelector).forEach((shortsEl) => {
            const item = shortsEl.closest(itemSelector);
            if (item) {
                item.classList.add(HIDE_CLASS);
            }
        });

        // 2. ショートのみで構成される棚・セクションをヘッダーごと非表示
        document.querySelectorAll(containerSelector).forEach((container) => {
            const items = container.querySelectorAll(itemSelector);
            // アイテムが0件の場合はスキップ (読み込み途中の誤非表示防止)
            if (items.length === 0) {
                return;
            }
            const allShorts = [...items].every((item) => item.querySelector(shortsSelector));
            if (allShorts) {
                container.classList.add(HIDE_CLASS);
            }
        });
    }
```

- [ ] **Step 4: 構文チェック**

Run: `node --check youtube-time-display.user.js && node --check youtube-time-display.js`
Expected: 出力なし (exit 0)

- [ ] **Step 5: 同一性チェック**

Run: `diff youtube-time-display.user.js youtube-time-display.js`
Expected: 出力なし

- [ ] **Step 6: Commit**

```bash
git add youtube-time-display.user.js youtube-time-display.js
git commit -m "feat: add hideShorts() helper and yt-shorts-hidden style"
```

---

### Task 2: ポーリングループとトグルへの配線

**Files:**
- Modify: `youtube-time-display.user.js` (setInterval ~L130、initialize ~L194)
- Modify: `youtube-time-display.js` (同一内容)

**Interfaces:**
- Consumes: Task 1 の `hideShorts()` / `isShortsHideEnabled`
- Produces: メニュー項目「ショート非表示 (ON/OFF) を切り替え」、`GM_setValue('isShortsHideEnabled', …)` 永続化

- [ ] **Step 1: 100ms ポーリングループの先頭で呼び出す**

`setInterval(() => {` の直後、`updateShoppingBadgeBlock();` の前に:

```js
    setInterval(() => {
        hideShorts();
        updateShoppingBadgeBlock();
```

- [ ] **Step 2: initialize() に状態読込・トグル関数・メニュー登録を追加**

`GM_registerMenuCommand('商品表示ブロック (ON/OFF) を切り替え', toggleShoppingBadgeBlockSetting);` の直後に:

```js
        // 7. ショート非表示の状態を読み込む (デフォルトは true)
        isShortsHideEnabled = await GM_getValue('isShortsHideEnabled', true);

        // 8. ショート非表示のトグルを実行する関数
        async function toggleShortsHideSetting() {
            isShortsHideEnabled = !isShortsHideEnabled;
            await GM_setValue('isShortsHideEnabled', isShortsHideEnabled);
            hideShorts();
            console.log(`[TimeDisplayScript] Shorts hide set to: ${isShortsHideEnabled}`);
        }

        // 9. Tampermonkeyのメニューにコマンドを登録
        GM_registerMenuCommand('ショート非表示 (ON/OFF) を切り替え', toggleShortsHideSetting);
```

- [ ] **Step 3: 既存の最終更新ステップを「10」にリナンバーし、`hideShorts()` 呼び出しを追加**

```js
        // 7. 読み込んだ状態でUIを一度更新
        // (トグルOFFの場合に最初から非表示にするため)
        updateDisplay();
        updateShoppingBadgeBlock();
```
を:
```js
        // 10. 読み込んだ状態でUIを一度更新
        // (トグルOFFの場合に最初から非表示にするため)
        updateDisplay();
        updateShoppingBadgeBlock();
        hideShorts();
```
に変更。

- [ ] **Step 4: 構文チェック**

Run: `node --check youtube-time-display.user.js && node --check youtube-time-display.js`
Expected: 出力なし (exit 0)

- [ ] **Step 5: 同一性チェック**

Run: `diff youtube-time-display.user.js youtube-time-display.js`
Expected: 出力なし

- [ ] **Step 6: Commit**

```bash
git add youtube-time-display.user.js youtube-time-display.js
git commit -m "feat: hide YouTube shorts everywhere with menu toggle"
```

---

### Task 3: ブラウザ E2E 検証

**Files:** 変更なし (検証のみ)

**Interfaces:**
- Consumes: Task 2 完了後の両ファイル

- [ ] **Step 1: ブラウザで youtube.com ホームを開き、GM API をスタブしてスクリプトを注入**

browser ツールで `https://www.youtube.com/` を開き (同意・ログインオーバーレイが出たら閉じる)、`run` で以下を実行:

```js
const fs = require('fs');
let src = fs.readFileSync('/mnt/c/Users/yukis/Documents/prog/youtube-time-display/youtube-time-display.user.js', 'utf8');
src = src.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, '');
const stubs = `window.GM_addStyle = () => {}; window.GM_getValue = async () => true; window.GM_setValue = async () => {}; window.GM_registerMenuCommand = () => {};`;
await page.evaluate(stubs + src);
await new Promise((r) => setTimeout(r, 3000));
```

- [ ] **Step 2: ショートが非表示になっていることを検証**

```js
const result = await page.evaluate(() => {
    const itemSel = 'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model';
    const hiddenCount = document.querySelectorAll('.yt-shorts-hidden').length;
    const stillVisible = [...document.querySelectorAll('ytm-shorts-lockup-view-model, a[href^="/shorts/"]')]
        .filter((el) => {
            const item = el.closest(itemSel);
            return item && getComputedStyle(item).display !== 'none';
        }).length;
    return { hiddenCount, stillVisible };
});
```

Expected: `stillVisible === 0` (フィード内に表示されたショートが残っていない)。`hiddenCount` が 0 の場合はフィードが未ロードか、そのセッションでショート棚が出ていないため、スクロールして再確認。スクロール後もショートが無い場合は Step 3 の手動チェックリストを参照。

- [ ] **Step 3: トグル OFF で復元されることを検証 (シミュレーション)**

```js
const toggled = await page.evaluate(() => {
    // トグル OFF 相当: 状態を false にし hideShorts() を再実行
    window.isShortsHideEnabled = false;
    // hideShorts は IIFE 内部のため再実行できない → クラス除去のみ検証
    document.querySelectorAll('.yt-shorts-hidden').forEach((el) => el.classList.remove('yt-shorts-hidden'));
    return document.querySelectorAll('.yt-shorts-hidden').length;
});
```

Expected: 0 (クラス除去が機能し、実装も同じ `classList.remove` パスを通る)。

- [ ] **Step 4: 手動テスト項目をユーザーに提示 (最終確認はユーザーの Tampermonkey 環境)**

- ホームのショート棚がヘッダーごと消える
- ホームグリッドに混ざる個別ショートが消える
- 検索結果のショート行が消える
- 視聴ページサイドバーのショートが消える
- トグル OFF → 全復元、ON → 再非表示、状態が再読み込み後も保持
- `/shorts/` ページの再生が正常
- 通常動画が影響を受けない
