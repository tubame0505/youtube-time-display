# Repository Guidelines

## Project Structure & Module Organization

This repository contains a small YouTube userscript with two top-level JavaScript files:

- `youtube-time-display.user.js`: Tampermonkey/Greasemonkey installable userscript. Keep the metadata block accurate here.
- `youtube-time-display.js`: plain script copy with the same runtime logic.

There are currently no dedicated `src/`, `test/`, or asset directories. If the project grows, keep browser-facing code in source files at the root or move shared logic into a clearly named `src/` directory, then document that change here.

## Build, Test, and Development Commands

No build system is configured. Edit the JavaScript files directly.

- `git status --short`: check the working tree before and after changes.
- `git diff -- youtube-time-display.user.js youtube-time-display.js`: review script edits.
- `git log --oneline -5`: inspect recent commit style.

For local validation, install or update `youtube-time-display.user.js` in Tampermonkey, open a YouTube watch page, and confirm the fixed time display updates every 100 ms and the Tampermonkey menu toggle persists.

## Coding Style & Naming Conventions

Use plain JavaScript compatible with userscript managers and current browsers. Follow the existing style: 4-space indentation, semicolons, `const`/`let`, camelCase variables and functions, and a single IIFE with `'use strict'`. Keep DOM ids descriptive and prefixed for this feature, such as `yt-current-time-display`.

Preserve the userscript metadata header format. When changing permissions or target pages, update `@grant`, `@match`, and `@exclude` entries deliberately.

## Testing Guidelines

There is no automated test framework or coverage requirement yet. Manually test on normal YouTube watch pages, playlist navigation, page transitions in YouTube's SPA UI, paused videos, and non-watch pages. Confirm the display hides when no main video exists and that toggling off immediately removes it.

If adding tests later, prefer focused unit tests for pure helpers such as `formatTime`, with filenames like `formatTime.test.js`.

## Commit & Pull Request Guidelines

Recent commits use short imperative messages, sometimes with prefixes such as `Add:` and `feat:`. Keep new commit subjects concise and action-oriented, for example `feat: update display interval` or `Add manual test notes`.

Pull requests should include a brief behavior summary, manual test steps, affected files, and screenshots or screen recordings for visible UI changes. Link related issues when available and call out any new userscript permissions.

## Security & Configuration Tips

Keep permissions minimal. Do not add broad `@match` patterns, external network requests, or extra `@grant` entries unless the feature requires them and the PR explains why.
