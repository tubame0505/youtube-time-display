// ==UserScript==
// @name         YouTube Current Time Display (Toggleable)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Displays the current YouTube video time in a fixed position. Toggleable via menu.
// @author       tubame0505
// @match        *://www.youtube.com/*
// @match        *://youtube.com/*
// @exclude      *://www.youtube.com/embed/*
// @exclude      *://youtube.com/embed/*
// @exclude      *://www.youtube.com/live_chat*
// @exclude      *://youtube.com/live_chat*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. UI要素の作成とスタイリング ---

    // 表示用のDIV要素を作成
    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'yt-current-time-display';
    // @run-at document-idle が指定されていれば、document.body は存在することが保証されるため、このままでOKです。
    document.body.appendChild(timeDisplay);

    // GM_addStyleを使用してCSSを適用
    GM_addStyle(`
        #yt-current-time-display {
          position: fixed;
          top: 50px;
          left: 10px;
          background: rgba(0, 0, 0, 0.75);
          color: white;
          padding: 5px 10px;
          border-radius: 5px;
          font-size: 23px;
          font-family: 'Roboto', Arial, sans-serif;
          z-index: 9999;
          display: none; /* 初期状態は非表示 */
        }
    `);

    // --- 2. ヘルパー関数 (時間フォーマット) ---

    /**
     * 秒数を HH:MM:SS.D または MM:SS.D 形式に変換する
     * @param {number} totalSeconds - 動画の現在時間（秒）
     * @returns {string} フォーマットされた時間文字列
     */
    function formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        // 小数点以下も含む秒数を取得
        const secondsWithDecimal = totalSeconds % 60;

        // 秒の整数部分と小数点以下1桁を取得
        const wholeSeconds = Math.floor(secondsWithDecimal);
        const tenthsOfSecond = Math.floor((secondsWithDecimal - wholeSeconds) * 10);

        const paddedMinutes = String(minutes).padStart(2, '0');
        // 秒数を2桁にパディングし、小数点以下1桁を連結
        const formattedSeconds = `${String(wholeSeconds).padStart(2, '0')}.${tenthsOfSecond}`;

        if (hours > 0) {
            return `${hours}:${paddedMinutes}:${formattedSeconds}`;
        } else {
            return `${paddedMinutes}:${formattedSeconds}`;
        }
    }


    // --- 3. メインロジック (SPA・トグル対応) ---

    let currentVideoElement = null; // 現在監視中の<video>要素
    let isDisplayEnabled = true; // 表示トグルの状態 (初期値)

    /**
     * UIの表示を更新するメイン関数
     * isDisplayEnabled と currentVideoElement の状態に基づいて表示/非表示を切り替える
     */
    function updateDisplay() {
        // 1. トグルがOFFの場合は、強制的に非表示
        if (!isDisplayEnabled) {
            timeDisplay.style.display = 'none';
            return;
        }

        // 2. トグルがONで、動画要素が検出されている場合
        if (currentVideoElement) {
            const formattedTime = formatTime(currentVideoElement.currentTime);
            timeDisplay.textContent = formattedTime;
            timeDisplay.style.display = 'block';
        }
        // 3. トグルがONだが、動画要素がない場合
        else {
            timeDisplay.style.display = 'none';
        }
    }

    // 監視ループ (SPA対応)
    // 500msごとにYouTubeのメイン動画プレイヤーを探す
    // (onurlchangeの代わりにポーリングする方式)
    setInterval(() => {
        // 現在のURLが動画再生ページ以外であれば、処理をしない (パフォーマンス改善のため)
        // ただし、@match を広げているため、動画要素が見つからない間は表示しないという既存ロジックで十分
        // if (!window.location.href.includes('/watch?v=')) {
        //     if (currentVideoElement) { // もし動画要素があった場合はリスナーを解除してリセット
        //         currentVideoElement.removeEventListener('timeupdate', updateDisplay);
        //         currentVideoElement.removeEventListener('pause', updateDisplay);
        //         currentVideoElement.removeEventListener('play', updateDisplay);
        //         currentVideoElement = null;
        //         updateDisplay();
        //     }
        //     return;
        // }


        const video = document.querySelector('video.html5-main-video');

        // ケース1: 新しい動画が検出された
        if (video && video !== currentVideoElement) {
            // 古いリスナーを削除
            if (currentVideoElement) {
                currentVideoElement.removeEventListener('timeupdate', updateDisplay);
                currentVideoElement.removeEventListener('pause', updateDisplay);
                currentVideoElement.removeEventListener('play', updateDisplay);
            }

            // 新しい動画をセット
            currentVideoElement = video;

            // 新しいリスナーを登録
            currentVideoElement.addEventListener('timeupdate', updateDisplay);
            currentVideoElement.addEventListener('pause', updateDisplay); // 停止時も更新
            currentVideoElement.addEventListener('play', updateDisplay); // 再生時も更新

            // UIを即時更新
            updateDisplay();
        }
        // ケース2: 動画が見つからなくなった (ページ遷移など)
        else if (!video && currentVideoElement) {
            // リスナーを削除し、変数をリセット
            currentVideoElement.removeEventListener('timeupdate', updateDisplay);
            currentVideoElement.removeEventListener('pause', updateDisplay);
            currentVideoElement.removeEventListener('play', updateDisplay);
            currentVideoElement = null;

            // UIを非表示に更新
            updateDisplay();
        }
        // ケース3: 動画要素があるが、currentVideoElementと変わっていない場合 (既存の動画を再生中の場合)
        // この場合は何もしない（timeupdateイベントが更新を処理する）
        // ただし、pause/playなどのイベントを拾いきれない可能性があるので、ポーリング時に updateDisplay() を呼ぶことで対応
        else if (video && video === currentVideoElement && isDisplayEnabled) {
            updateDisplay(); // 念のため、動画が存在し表示が有効なら常に更新
        }
    }, 50); // 0.05秒ごとにチェック

    // --- 4. トグル機能と初期化処理 ---

    /**
     * スクリプトの初期化処理 (非同期)
     * 保存されたトグル状態を読み込み、メニューコマンドを登録する
     */
    async function initialize() {
        // 1. 保存されたトグル状態を読み込む (デフォルトは true)
        isDisplayEnabled = await GM_getValue('isDisplayEnabled', true);

        // 2. トグルを実行する関数
        async function toggleDisplaySetting() {
            // 状態を反転
            isDisplayEnabled = !isDisplayEnabled;
            // 状態を保存
            await GM_setValue('isDisplayEnabled', isDisplayEnabled);
            // UIを即時更新
            updateDisplay();
            console.log(`[TimeDisplayScript] Display set to: ${isDisplayEnabled}`);
        }

        // 3. Tampermonkeyのメニューにコマンドを登録
        GM_registerMenuCommand('時間表示 (ON/OFF) を切り替え', toggleDisplaySetting);

        // 4. 読み込んだ状態でUIを一度更新
        // (トグルOFFの場合に最初から非表示にするため)
        updateDisplay();
    }

    // スクリプトの初期化を実行
    initialize();

})();
