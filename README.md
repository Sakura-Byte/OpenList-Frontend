# OpenList (frontend)

![License MIT](https://img.shields.io/badge/license-MIT-green)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/OpenListTeam/OpenList-Frontend)](./package.json)
[![NPM Version](https://img.shields.io/npm/v/%40openlist-frontend%2Fopenlist-frontend)](https://www.npmjs.com/package/@openlist-frontend/openlist-frontend)
[![NPM Downloads](https://img.shields.io/npm/dw/%40openlist-frontend%2Fopenlist-frontend)](https://www.npmjs.com/package/@openlist-frontend/openlist-frontend)
[![NPM Last Update](https://img.shields.io/npm/last-update/%40openlist-frontend%2Fopenlist-frontend)](https://www.npmjs.com/package/@openlist-frontend/openlist-frontend)

## BUILD

You can use [the build script](./build.sh).

```plaintext
Usage: ./build.sh [--dev|--release] [--compress|--no-compress] [--enforce-tag] [--skip-i18n] [--lite]

Options (will overwrite environment setting):
  --dev         Build development version
  --release     Build release version (will check if git tag match package.json version)
  --compress    Create compressed archive
  --no-compress Skip compression
  --enforce-tag Force git tag requirement for both dev and release builds
  --skip-i18n   Skip i18n build step
  --lite        Build lite version

Environment variables:
  OPENLIST_FRONTEND_BUILD_MODE=dev|release (default: dev)
  OPENLIST_FRONTEND_BUILD_COMPRESS=true|false (default: false)
  OPENLIST_FRONTEND_BUILD_ENFORCE_TAG=true|false (default: false)
  OPENLIST_FRONTEND_BUILD_SKIP_I18N=true|false (default: false)

The build script now downloads translations from GitHub releases instead of Crowdin. It fetches `i18n.tar.gz` from the tag-matching release of the repository defined by `OPENLIST_I18N_REPO` (default: `OpenListTeam/OpenList-Frontend`) and falls back to the latest available release that contains `i18n.tar.gz` if the tag is missing that asset. Use `--skip-i18n` or `OPENLIST_FRONTEND_BUILD_SKIP_I18N=true` to bypass the download.
```

## LICENSE

MIT

## CREDITS

[OpenList](https://github.com/OpenListTeam/OpenList) is a resilient, community-driven fork of [AList](https://github.com/AlistGo/alist) — built to defend open source against trust-based attacks.
