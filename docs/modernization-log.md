# OpenList Frontend Modernization Log

## Phase 1 — Core Design Tokens, Workspace Sheet, Decoupled Notices & Promotions, and Structured Folder Facts

### Key Decisions & Rationale

1. **Zero-Runtime Warm Neutral CSS Tokens & Single Derived Accent (`src/styles/modern-tokens.css`, `src/utils/theme_sync.ts`)**
   - **Decision**: Establish a CSS Custom Property design system rooted in a single site-owner seed (`getMainColor()` -> `--site-main` -> `--ol-accent` and `color-mix(in oklab, ...)` derivatives) paired with warm neutral canvas/sheet surfaces (`#f4f4f2` / `#ffffff` in light mode, `#131315` / `#1c1c1f` in dark mode).
   - **Rationale**: Resource-index sites derive personality from the site owner's wallpaper, `main_color`, logo, and authored Markdown—not decorative SaaS gradients, pill badges, or colored icon backgrounds. Theme switching uses `document.startViewTransition` (~200ms crossfade, automatically skipped under `prefers-reduced-motion: reduce`).

2. **Unified Tabler Iconography & Zero Emoji UI Policy (`src/components/icons-tb.tsx`, `src/utils/icon.ts`)**
   - **Decision**: Standardize UI, toolbar, context-menu, search, and file-type glyphs onto `solid-icons/tb` with `.ol-ico { stroke-width: 1.75 }`, a two-tone `FolderGlyph` tinted by `--site-main`, and folded-page `FileTile` extension badges in Grid view. Strip `home_icon` / `share_icon` emoji prefixes from breadcrumbs.
   - **Rationale**: Eliminates visual weight mismatches from mixing 14 disparate icon packs and removes emoji icons across OS/browser font engines while surfacing archive extensions (`7Z`, `RAR`, `MKV`, `FLAC`) directly on grid tiles.

3. **GPU-Composited Wallpaper & Single `.ol-sheet` Workspace Hierarchy (`src/pages/home/`)**
   - **Decision**: Render `appearance_wallpaper` (line 1 light, optional line 2 dark) on a single `position: fixed; inset: 0; z-index: -1; transform: translateZ(0)` layer and consolidate the Home workspace into a single `.ol-sheet` (`data-surface="glass|solid"`, `--ol-wallpaper-blur`) with a strict top-to-bottom sequence:
     1. `.ol-bar.header` (brand, `Ctrl+K`/`⌘K` search trigger, segmented view switcher, theme toggle, login/manage link; no notification bell).
     2. `.ol-notice` (collapsible 1-line operational banner).
     3. `.ol-crumbs.nav` (plain-text breadcrumbs + right-aligned tabular item count and total size).
     4. `.ol-facts` (1-click copy `.ol-pw` archive password pills + safe Markdown/bare-URL `source_note` links) and `.ol-dir-tip` (compact directory `header`).
     5. `.ol-adslot` (`header_banner` creatives explicitly labeled `"广告"` with `data-nosnippet` and Matomo `data-track-content` attributes).
     6. `.obj-box` file list/grid, replacing `.ol-list__head` in-place with `.ol-selbar` on selection (sticky bottom on mobile, removing the floating `<Center />` dock).
   - **Rationale**: Eliminates `background-attachment: fixed` scroll repaints and brittle `.hope-c-*` CSS overrides, maximizes above-the-fold file visibility, and preserves `.obj-box`, `.list-item`, `.grid-item`, `.nav`, `.header`, `.body`, and `.footer` class hooks.

4. **Native Checkbox Semantics on Row & Tile Containers (`ListItem.tsx`, `GridItem.tsx`, `helper.ts`)**
   - **Decision**: Render `.ol-row` and `.ol-tile` outer wrappers as `<div role="option">` with `<LinkWithPush>` scoped to the filename text, and call only `e.stopPropagation()` (never `e.preventDefault()`) on `.ol-row__check` / `.ol-tile__check` while excluding interactive controls from `@viselect/vanilla` `beforestart`.
   - **Rationale**: Calling `e.preventDefault()` on an ancestor of `<input type="checkbox">` cancels native browser checkbox toggling and `change` dispatch. Keeping `<div>` row wrappers preserves both native checkbox multi-select (`.ol-selbar`), middle/cmd-click link opening on names, rubber-band drag selection, and right-click context menus.

5. **Decoupled Notices & Promotions with Single-Modal-Per-Visit Orchestration (`src/store/notices.ts`, `src/store/promotions.ts`, `NoticeModal.tsx`, `PromoPopupModal.tsx`)**
   - **Decision**: Separate operational announcements (`/public/notices`) from commercial ad slots (`/public/promotions`) with automatic fallback to legacy `announcement` when the new endpoints 404 or are empty. Enforce at most one auto-opened modal per visit: unread modal/critical notices open first and defer `popup_ad` to the next visit without consuming the promotion's `freq_cap`. Clamp `CloseDelaySec` strictly to `0..10`s with a conic countdown ring locking `Esc` and backdrop dismissal until `0`, plus local-midnight snoozing (`"今天不再显示"`).
   - **Rationale**: Prevents double-modal collisions, keeps commercial copy out of directory SEO summaries via `data-nosnippet`, and eliminates custom `localStorage`/DOM hacks in `customize_body`.

6. **Safe Rich Markdown Sanitization & Native Footer Telemetry (`src/components/Markdown.tsx`, `src/pages/home/Footer.tsx`)**
   - **Decision**: Extend `rehype-sanitize` with a strict property/value CSS sanitizer (`border-radius`, safe gradients, layout spacing) and tracking attribute whitelist (`data-track-content`, `data-content-name`, `data-content-piece`, `data-nosnippet`), add GitHub Alerts (`[!NOTE]`..`[!CAUTION]`), rounded `.ol-md-code-block` / `.ol-md-table-wrap` (`display: flow-root`), heading slug IDs, and an in-memory LRU render cache. Implement native `site_launch_at` uptime days, `PerformanceNavigationTiming` load duration, and `footer_links` JSON in `Footer.tsx`.
   - **Rationale**: Fixes clipped/stripped rounded corners under `filter_readme_scripts=true`, eliminates re-mount height flicker during folder navigation, and removes the need for external jQuery/FontAwesome scripts in `customize_head`.

### Deviations & Additions

- Added `color-scheme: light` / `color-scheme: dark` explicitly on `[data-modern-theme]` scopes in `src/styles/modern-tokens.css` so native checkboxes in dark mode match the `#1c1c1f` card surface.
- Implemented shallow `DirInfoProvider` & `ProviderResolver` passthrough in backend `OpenList` early in Phase 1 so `GalGames` and `Alias` routes can surface structured directory metadata cleanly alongside `x_meta`.

### Phase 1 Verification Summary (`verifier-neon`)

- Backend (`OpenList`, branch `modernize/phase-1-core-fullstack`): `go build ./...` & `go test ./internal/op/... ./server -run "TestMeta|TestNotice|TestPromotion|TestHiddenPaths"` PASS.
- Frontend (`OpenList-Frontend`, branch `modernize/phase-1-core-fullstack`): `pnpm lint` (`tsc --noEmit`) & `pnpm build` PASS.
- Full-stack CDP E2E (`127.0.0.1:5244` + `:5173`): 29/29 assertions PASS, 0 console/page errors across Light/Dark × Wallpaper Glass/Solid, single-modal Notice -> Promo 4s countdown lock + midnight snooze, `/3D` inherited header tip without 18KB root Readme leakage, `/Galgames/sub` `.ol-facts` & in-place `.ol-selbar`, `/@manage/{notices,promotions}`, and `390x844` mobile layout.
- External verification screenshots (`C:\Users\SakuraPY\.gemini\antigravity\brain\49caf45b-3dd1-413d-bfec-45cbc4923c28\`):
  - `01-visit1-notice-modal.png`, `03-visit2-promo-locked.png`, `04-root-light-glass.png`, `05-root-dark-glass.png`, `06-root-dark-solid.png`, `07-root-light-solid.png`, `08-subdir-3d.png`, `09-galgames-list-selbar.png`, `10-galgames-grid-selbar.png`, `11-manage-notices.png`, `12-manage-promotions.png`, `13-mobile-root.png`, `14-mobile-galgames.png`.

---

## Phase 2 — Universal SSR/SPA SEO, 0-RTT Bootstrap Hydration, Modern Markdown Engine, Instant `⌘K` Palette, and JMComic + ASMR.ONE v2 Overhaul

### Key Decisions & Rationale

1. **0-RTT Bootstrap Hydration (`src/utils/config.ts`, `src/app/App.tsx`, `src/store/notices.ts`, `src/store/promotions.ts`)**
   - **Decision**: Read `window.__OPENLIST_BOOTSTRAP__` (`{ settings, archive_extensions, initialized, notices, promotions }`) synchronously before mounting `<Switch>` in `App.tsx`, initializing `loading` to `false` when `boot.settings` is present and hydrating `notices` / `promotions` without firing redundant `/public/settings`, `/public/archive_extensions`, `/public/init_status`, `/public/notices`, or `/public/promotions` XHR round-trips.
   - **Rationale**: Eliminates the cold-visit `<FullScreenLoading />` spinner flash on Go-served pages while gracefully falling back to standard HTTP requests in `pnpm dev` or older backend versions.

2. **Modern Markdown Compatibility Engine & Dark-Mode Contrast Rescue (`src/components/Markdown.tsx`, `src/components/markdown.css`, `src/pages/home/Readme.tsx`)**
   - **Decision**: Upgrade the `unified` / `rehype-sanitize` pipeline with:
     - **Safe HTML & CSS Whitelisting**: Preserve legacy README layout attributes (`align`, `clear`, `width`, `height`, `open`, `id`, `referrerpolicy`, `target`, Matomo `data-track-content` / `data-content-name` / `data-content-piece`, `data-nosnippet`, `data-umami-event`) and safe inline CSS (`border-radius`, `padding*`, `margin*`, `border*`, `background-color`, gradient-only `background-image`, `color`, `box-shadow`, `text-align`, `max-width`, `width`, `height`, `display`, `flex*`, `gap`, `overflow`), while stripping `<script>`, `<iframe>`, `on*`, `javascript:`, `position: fixed`, and CSS `url(...)`.
     - **Dark-Mode Inline Color Rescue**: Parse hardcoded dark inline `color` values (`#333`, `rgb(40,40,40)`, `black`, etc. with relative luminance `< 0.24` and no light inline `background-color` on self/ancestors) and rewrite them to `color-mix(in oklab, <color> 35%, #f3f3f4)` under `[data-modern-theme="dark"]`.
     - **Float Containment & `#sponsor` Anchor**: Enforce `display: flow-root` on `.markdown-body`, support `img[align="right"|"left"]` and `br[clear="all"]`, and assign `id="sponsor"` automatically to sponsor headings (`赞助` / `Sponsor`) so child-directory `/#sponsor` links scroll cleanly.
     - **Zero-Blink Readme Retention**: Retain the previous Markdown string while an async remote `README.md` fetch resolves and cache parsed HAST trees in a 20-entry LRU map.
   - **Rationale**: Real-world OpenList READMEs rely heavily on authored HTML cards, right-floated badges, and inline `#333` text designed for light backgrounds; rescuing luminance in dark mode and containing floats prevents unreadable text and overflowing images without weakening XSS protection.

3. **Client-Side 4-Tier Ad-Free SEO & JSON-LD Sync (`src/utils/seo.ts`, `src/pages/home/Obj.tsx`)**
   - **Decision**: Synchronize `document.title`, `<meta name="description">`, `og:title`, `og:description`, `og:url`, `og:image`, `<link rel="canonical">`, and `<script id="openlist-jsonld">` (`BreadcrumbList` + `CollectionPage`/`MediaObject`) on every SPA navigation using a 4-tier ad-free hierarchy (`asmrone_work` -> `source_note`/`header`/`readme` stripped of `data-nosnippet` blocks -> folder/file count summary -> `site_description`/`site_title`), and suppress indexing (`noindex, nofollow`, clearing JSON-LD) on password-gated or error states.
   - **Rationale**: Keeps client-side SPA metadata aligned with the Go SSR `seo.go` engine and guarantees commercial promotions and operational notices never pollute OpenGraph cards or search snippets.

4. **Instant `⌘K / Ctrl+K` Command Palette (`src/pages/home/folder/Search.tsx`, `src/utils/api.ts`)**
   - **Decision**: Wire `AbortController` into `fsSearch` (`250ms` debounce, aborting stale in-flight `/fs/search` requests on keystroke or close), enforce 1-keystroke `Esc` dismissal, surface instant current-directory items when the query is empty, highlight matched substrings with safe `<mark>` spans (no `mark.js`), and display a clear localized notice (`home.search.disabled_hint`) when `search_index === "none"`.
   - **Rationale**: Prevents out-of-order search responses from overwriting newer queries and gives keyboard users immediate feedback even before typing or when server-side indexing is disabled.

5. **Unified v2 JMComic & ASMR.ONE Experience (`Poster*.tsx`, `src/pages/home/jmcomic/*`, `src/pages/home/asmrone/*`, `ListItem.tsx`, `audio.css`)**
   - **Decision**:
     - **Shared Poster Grid (`Poster.tsx`, `PosterItem.tsx`, `poster.css`)**: Rebuild onto Demo v2 `.ol-posters` / `.ol-poster` (`1px solid var(--ol-border)`, `aspect-ratio: var(--poster-aspect)` `3/4` for JMComic and `4/3` for ASMR.ONE, `splitWorkCode` extracting `JM...` / `RJ...` + date into `.ol-poster__meta`, 2-line `.ol-poster__title`, `<div>` outer card with native `.ol-poster__check` checkbox semantics).
     - **JMComic v2 (`JMComicView.tsx`, `ExportControls.tsx`, `TagFolders.tsx`, `work-page.css`, `reader.css`)**: `.jm-work` hero (`3:4` cover, title, `JM号 · 作者 · 日期 · 共 N 话`, `#tag` links, expandable intro, `"开始阅读"` / `"继续阅读"` CTA, `"从头开始"`, `"文件列表"`, collapsible CBZ/ZIP/PDF `"导出"` panel, hairline `.jm-chapters` list with sort toggle and saved progress) + `#121213` full-screen `.jm-reader` (auto-hiding chrome, `<input type="range">` page scrubber, `restoreMoves` canvas unscrambling, `±2` active window, slide-over chapter/export drawer, end-of-chapter `"下一话"` CTA) + filterable `#tag` directory.
     - **ASMR.ONE v2 (`ASMRWorkView.tsx`, `asmr.css`, `Folder.tsx`, `ListItem.tsx`, `audio.css`)**: `.ol-asmr-work` hero (`4:3` cover, title, `RJ号 · 社团 · 发售日`, CV voice actors, `#tag` labels, expandable intro, `"播放全部音频"`, `"查看说明"`, `"下载封面"`), consuming `dir_info.extra.asmrone_work` with automatic fallback to synthesized `README.md` + `cover.jpg` parsing, inline Play triggers on audio rows in `ListItem.tsx`, a unified `--ol-*` inline audio player bar (`0.75x..2.0x` rate, collapsible playlist queue, synchronized `.lrc`/`.vtt` subtitles, `navigator.mediaSession`), and `--ol-*` themed APlayer CSS.
   - **Rationale**: Replaces bespoke per-driver visual islands with cohesive `--ol-*` warm-neutral surfaces while preserving specialized comic unscrambling, client-side archive export, and multi-track `.lrc`/`.vtt` voice-work playback.

### Deviations & Additions

- Wrapped Work Hero header fields inside `.jm-head` with `display: contents` on `.jm-info` below `@container home` / `@media` mobile breakpoints so long `"继续阅读"` CTA labels truncate cleanly (`minmax(0, 1fr)`) without clipping at 390px viewport width.
- Aligned `ObjType` numeric icon fallbacks (`{ 2: "video", 3: "audio", 4: "text", 5: "image" }`) and registered `lrc` under `"subtitle"` (`[CC]` icon) in `src/components/icons-tb.tsx`.

### Phase 2 Verification Summary (`verifier-neon`)

- Backend (`OpenList`, branch `modernize/phase-2-seo-md-special`): `go build ./...`, `go test ./server/static/... ./drivers/asmrone/... ./internal/op/...` PASS.
- Frontend (`OpenList-Frontend`, branch `modernize/phase-2-seo-md-special`): `pnpm lint` & `pnpm build` PASS.
- Real Go `dist_dir` SSR + Chrome CDP E2E (`127.0.0.1:5244` + mock ASMR.ONE/JMComic/GalGames/Alias): 25/25 assertions PASS, 0 JS page errors, verifying `window.__OPENLIST_BOOTSTRAP__` 0-RTT hydration, ad-free 4-tier SSR/SPA SEO + JSON-LD + semantic `<noscript>`, Markdown dark-mode contrast rescue / `flow-root` / Alerts / `#sponsor`, `Ctrl+K` Command Palette, `ASMR.ONE` `4:3` posters + Work Hero + WAV player + synced `.lrc`, `JMComic` `3:4` posters + `TagFolders` + Work Hero + `#121213` canvas reader, `AliasGalgames` passthrough, and 390px mobile responsiveness.
- External verification screenshots (`C:\Users\SakuraPY\.gemini\antigravity\brain\49caf45b-3dd1-413d-bfec-45cbc4923c28\`):
  - `p2-01-root-light-glass-md.png`, `p2-02-root-dark-glass-md.png`, `p2-03-root-light-solid.png`, `p2-04-command-palette.png`, `p2-05-asmr-poster-grid.png`, `p2-06-asmr-work-player.png`, `p2-07-jm-poster-grid.png`, `p2-08-jm-tags.png`, `p2-09-jm-work-hero.png`, `p2-10-jm-reader.png`, `p2-11-galgames-alias.png`, `p2-12-mobile-asmr-work.png`, `p2-13-mobile-jm-work.png`.

---

## Phase 3 — Native ESM + Runtime CDN Build, Bundle Slimming, 5,000-Row Virtual Scrolling, and `@kobalte/core` UI Primitives

### Key Decisions & Rationale

1. **Native ESM Build & Runtime CDN Resolution (`vite.config.ts`, `index.html`, `package.json`)**
   - **Decision**: Replace `vite-plugin-dynamic-base` (and `fixLegacyPolyfillDataSrc`) with `base: "/"` + Vite's `experimental.renderBuiltUrl` backed by `window.__openlistAssetUrl(p)` in `index.html`, and gate `@vitejs/plugin-legacy` behind `VITE_LEGACY=true` (`pnpm build:legacy`).
   - **Rationale**: Emits native `<script type="module" crossorigin>` and `<link rel="modulepreload">` in `dist/index.html` instead of dynamic script-injection shims. When `window.OPENLIST_CONFIG.cdn` is empty (`""`, standard embedded Go binary), `window.__openlistAssetUrl` resolves root-relative `/assets/...` (or `<base_path>/assets/...`), preventing broken `/Galgames/assets/...` requests on deep SPA routes; when `cdn` is configured (`https://cdn.example.com`), dynamic JS chunks and asset URLs prefix with `cdn` automatically. Gating SystemJS legacy output speeds up `pnpm build` / `pnpm build:lite` by ~8.8x (`17.8s` -> `2.0s`).

2. **Lazy Markdown Engine + `highlight.js/lib/core` + Scoped Parallel i18n (`src/components/markdown_engine.ts`, `src/components/Markdown.tsx`, `src/app/i18n.ts`, `src/app/App.tsx`)**
   - **Decision**:
     - Extract `unified`, `remark-*`, `rehype-*`, and `highlight.js/lib/core` (registering 16 high-frequency languages: `bash`, `shell`, `json`, `yaml`, `javascript`, `typescript`, `go`, `python`, `sql`, `xml`, `css`, `ini`, `markdown`, `diff`, `c`, `cpp`) out of `Markdown.tsx` into a dynamically imported `markdown_engine.ts` chunk.
     - Refactor `src/app/i18n.ts` to load visitor namespaces (`global`, `home`, `login`, `init`, `shares`, `indexes`, `metas`, `notices`, `promotions`, `jmcomic`, `index`) for active locale + English fallback + `lang_extra` in a single parallel `Promise.all`, deferring heavy admin namespaces (`drivers.json` 61.8 KB, `settings`, `storages`, `manage`, `tasks`, `users`, `plugins`, `br`) until `/@manage` mounts via `ensureAdminI18nLoaded()`.
   - **Rationale**: Previously, `components/index.ts` re-exported `Markdown.tsx` + full 190-language `highlight.js` into the root `index-*.js` entry (`1,379.64 KB` raw / `442.30 KB` gzip). Splitting `markdown_engine.ts` and switching to `highlight.js/lib/core` shrinks `index-*.js` by **91.8%** (`113.16 KB` raw / `37.93 KB` gzip) while `lightgallery` remains dynamically imported on demand.

3. **Window-Scrolled Virtual File List (`@tanstack/solid-virtual` in `src/pages/home/folder/List.tsx`)**
   - **Decision**: Engage `createWindowVirtualizer` automatically when visible directory entries exceed `100` (`overscan: 12`, `indexAttribute: "data-vindex"`, `ResizeObserver`-synced `scrollMargin`, `measureElement` height tracking), while keeping static `<For>` rendering for `<= 100` items.
   - **Rationale**: Keeps mounted `.ol-row.list-item` DOM nodes strictly `< 60` (~30–48 nodes) even in 5,000-item directories while preserving full-page document scrolling, `@viselect/vanilla` rubber-band drag selection (`data-index`), `Shift+Click` range selection, native checkboxes, and in-place `.ol-selbar`.

4. **`@kobalte/core` Accessible Primitives & Unified `--ol-*` Overlays (`src/components/ui/`, `ModalInput.tsx`, `ModalTwoInput.tsx`, `FolderTree.tsx`, `EnhancedFolderTree.tsx`, `context-menu.tsx`, `notify.tsx`, `TorrentFileList.tsx`)**
   - **Decision**: Build `OlDialog` (`@kobalte/core/dialog`) and `OlToastRegion` / `showOlToast` (`@kobalte/core/toast`) in `src/components/ui/` styled exclusively with `--ol-*` warm-neutral tokens, migrating `ModalInput`, `ModalTwoInput`, `ModalFolderChoose` / `FolderChooseInput` / `FolderTree` / `EnhancedFolderTree`, `ContextMenu`, and `notify.{success,error,info,warning,render}` while preserving 100% of existing component props and imperative `notify.*` APIs. Replaced the final emoji glyphs in `TorrentFileList.tsx` with `FolderGlyph`, `FileIcon`, and Tabler chevrons.
   - **Rationale**: Unifies dialogs, directory pickers, right-click menus, and toast notifications onto accessible focus-trapped primitives with consistent warm-grey surfaces in both Light and Dark themes.

### Bundle Size Comparison (`pnpm build`, KiB = 1024 B)

| Metric                                               |                  Phase 2 Baseline |                       Phase 3A Result |                                                                  Delta |
| ---------------------------------------------------- | --------------------------------: | ------------------------------------: | ---------------------------------------------------------------------: |
| Initial Entry Chunk (`index-*.js`)                   |    `1,379.64 KB` (`442.30 KB` gz) |       **`113.16 KB` (`37.93 KB` gz)** |                        **`-1,266.48 KB` (`-91.8%` raw / `-91.4%` gz)** |
| Initial Boot JS (`index` + `store`)                  |    `1,875.19 KB` (`593.50 KB` gz) |      **`680.80 KB` (`204.64 KB` gz)** |                        **`-1,194.39 KB` (`-63.7%` raw / `-65.5%` gz)** |
| Lazy Markdown + `hljs/core` (`markdown_engine-*.js`) |             Eager in `index-*.js` |      **`405.76 KB` (`124.33 KB` gz)** |                                     Deferred until `<Markdown>` mounts |
| Total Modern JS (`dist/assets/*.js`)                 |  `7,027.39 KB` (`2,046.06 KB` gz) |  **`6,283.27 KB` (`1,803.54 KB` gz)** | **`-744.12 KB` (`-242.52 KB` gz)** (incl. `solid-virtual` + `kobalte`) |
| Legacy SystemJS (`*-legacy-*.js`)                    |  `7,307.27 KB` (`2,137.74 KB` gz) |    **`0 KB`** (opt-in `build:legacy`) |                                 **`-7,307.27 KB` (`-2,137.74 KB` gz)** |
| Total `dist/assets/*` (`254` -> `170` files)         | `19,027.54 KB` (`6,327.22 KB` gz) | **`10,981.69 KB` (`3,948.58 KB` gz)** |                        **`-8,045.85 KB` (`-42.3%` raw / `-37.6%` gz)** |
| `dist/index.html`                                    |                         `4,540 B` |                         **`2,332 B`** |                      **`-2,208 B` (`-48.6%`)**, native `modulepreload` |
| Production Build Time (`pnpm build`)                 |                         `17.83 s` |                          **`2.03 s`** |                                                      **`8.8x` faster** |

### Deviations & Additions

- Restored lightweight `"manage"` (~1.5 KB, required for breadcrumb `"首页"` / `"分享"`) and `"users"` namespaces into `VISITOR_NAMESPACES` in `src/app/i18n.ts` while keeping heavy admin namespaces (`drivers.json` 61.8 KB, `settings`, `storages`, `tasks`, `plugins`, `br`) strictly lazy-loaded until `/@manage` mounts.
- Updated `<LinkWithPush onClick>` in `ListItem.tsx`, `GridItem.tsx`, and `PosterItem.tsx` plus added explicit `shift` range selection forwarding on row/tile/checkbox activation in `src/store/obj.ts` so `Shift+Click` reliably selects contiguous ranges in both virtualized and static views.

### Phase 3 & Stage 4 Full Real-Stack Verification Summary (`verifier-neon`)

- Backend (`OpenList`, branch `modernize/phase-3-perf-primitives`): `go build ./...`, `openlist migrate-modern --dry-run` CLI audit, and all 19 Go test packages PASS.
- Frontend (`OpenList-Frontend`, branch `modernize/phase-3-perf-primitives`): `pnpm lint`, `pnpm build:lite`, and `pnpm build` (`1.71 s`) PASS; `dist/index.html` emits native `<script type="module" crossorigin src="/assets/index-*.js">` (`115.88 KB` raw / `38.87 KB` gz) with zero legacy bundles (`LEGACY_FILE_COUNT=0`).
- Full Real Embedded-Binary E2E (`openlist.exe` embedding compiled `dist/` on `:5299` + local `JMComic`/`GalGames`/`ASMR.ONE` mock upstreams):
  - 0-RTT `window.__OPENLIST_BOOTSTRAP__`, deep-route `/assets/*.js` HTTP 200 on direct reload, lazy `lightgallery` on gallery open.
  - `/Local/Stress5000` (5,000 items): virtual scroller mounts `< 60` (`26`) DOM `.ol-row` elements smoothly; `Shift+Click` selects 5 contiguous rows into in-place `.ol-selbar`.
  - Kobalte `OlDialog` (`ModalInput`) & `OlToastRegion` (`notify`), Chinese `"首页"` breadcrumb, zero Emoji UI glyphs, preserved `.obj-box`/`.list-item`/`.nav`/`.header`/`.footer` classes.
  - `JMComic` `/标签` filter + `3:4` posters + Work Hero + collapsible Export + `#121213` canvas unscramble reader + range scrubber + chapter 2 persistence; `GalGames` & `/AliasGalgames` `DirInfo`, password pills & HTTP 302 downloads; `ASMR.ONE` & `/AliasASMR` `4:3` auto-poster + Work Hero + WAV `1.25x` inline player with synced `.lrc` + Dark Glass APlayer; SSR SEO/JSON-LD/`<noscript>` (0 ad leaks); Mobile `390x844` zero overflow or clipping; 0 JS `pageerror` and 0 failed 4xx/5xx requests.
- External verification screenshots (`C:\Users\SakuraPY\.gemini\antigravity\brain\49caf45b-3dd1-413d-bfec-45cbc4923c28\`):
  - `s4-01-stress5000-virtual.png`, `s4-02-kobalte-dialog-toast.png`, `s4-03-jm-today-posters.png`, `s4-04-jm-reader-page2.png`, `s4-05-asmr-player-125x.png`, `s4-06-dark-glass-aplayer.png`, `s4-07-root-dark-glass.png`, `s4-08-root-light-glass.png`, `s4-09-root-light-solid.png`, `s4-10-mobile-root.png`, `s4-11-mobile-jm-work.png`.

---

## Phase 4 — Admin Console & Login v2 Overhaul

### Key Decisions & Rationale

1. **Unified `.ol-admin` Shell, 5 Flat Semantic Navigation Groups & HopeUI Token Harmonization (`src/pages/manage/manage.css`, `index.tsx`, `SideMenu.tsx`, `sidemenu_items.tsx`, `Header.tsx`, `routes.tsx`)**
   - **Decision**: Replace the legacy HopeUI shadow sidebar and nested accordion menus with a 232px hairline `.ol-admin-sidebar` organized into 5 flat semantic groups (`Overview`, `Content & Storage`, `Operations`, `Tasks & Users`, `System`), sticky brand header, and sticky utility footer (visitor home link, language switch, theme transition toggle, docs, logout), paired with a `< 768px` sticky `.ol-admin-mobile-bar` and slide-over drawer. Remap `--hope-colors-*` and `.hope-{input,textarea,select,button,badge,switch,checkbox,table,modal,popover,menu}` inside `.ol-admin`, `.ol-login`, and `body[data-ol-admin-portal="true"]` to `--site-main` / `--ol-*` warm neutrals while keeping 100% of existing `/@manage/*` URLs backward compatible.
   - **Rationale**: Flattening top-level navigation eliminates nested sidebar accordions (moving Settings and Tasks subroutes into horizontal `.ol-admin-tabs`), while CSS-variable harmonization gives every dynamic driver input and modal crisp 1px borders and dark/light contrast without rainbow badges or gradients.

2. **Real Admin Overview & Clean `/@login` Sheet (`Dashboard.tsx`, `About.tsx`, `src/pages/login/index.tsx`, `SSOLogin.tsx`)**
   - **Decision**:
     - Upgrade `Dashboard.tsx` (`/@manage` for admins; non-admins render `<Profile />`, with `/@manage/profile` available to admins) to fetch `/admin/storage/list`, `/admin/meta/list`, `/admin/user/list`, and (on Go backend) `/public/notices` + `/public/promotions` in parallel, displaying 4 `.ol-tabular` metric cards, Quick Actions tiles, and a Recent Storages Health summary with `6px` `.ol-status-dot` indicators.
     - Remove cartoon `LoginBg` SVG blobs from `/@login` and render a centered `.ol-sheet` over `--ol-bg-canvas` with optional GPU-composited `appearance_wallpaper` + `appearance_surface_mode` glass backdrop, `SiteLogo`, and full password-hash, LDAP, 2FA OTP, WebAuthn (`TbFingerprint`), SSO (`solid-icons/tb`), Remember Me, and Guest browse flows.
   - **Rationale**: Gives site operators immediate visibility into broken storage mounts and active operational/commercial channels upon opening `/@manage`, and aligns `/@login` visually with the visitor workspace.

3. **Workspace Overhauls Across Storages, Metas, Shares, Indexes, Operations, Tasks, Users & System (`src/pages/manage/**`)**
   - **Decision**:
     - **Content & Storage (`storages/*`, `metas/*`, `shares/*`, `indexes/*`)**: Status filter `.ol-admin-tabs`, `.ol-admin-search` + driver filter + Grid/Table switcher, quiet `.ol-status-dot` / `.ol-pill` cards, ASMR.ONE & JMComic sync modals, ID-reconciled `Metas` grid/batch-replace editor with `.ol-sticky-actions`, and `solid-icons/tb` search index progress & scan cards.
     - **Operations & Access (`notices/*`, `promotions/*`, `download-stats.tsx`, `users/*`)**: Live `.ol-notice` banner preview in Notice editor, aspect-safe (`object-fit: contain`) Promotion thumbnails & preview, `.ol-tabular` Download Stats ranking bars, and localized `users.roles.*` pills with compact `X / Y` permission summaries, rate-limit cards, 2FA, SSO, WebAuthn, and SSH key management.
     - **System & Tasks (`SettingsShell.tsx`, `settings/*`, `TasksShell.tsx`, `tasks/*`, `backup-restore.tsx`, `plugins/*`, `messenger/*`)**: Horizontal `.ol-admin-tabs` across all 10 Settings groups (with instant keyword filter in `Common.tsx` and `.ol-sticky-actions`) and all 5 Task queues (`.ol-status` dots + `.ol-tabular` progress), emoji-free `TbCircleCheck`/`TbCircleX`/`TbInfoCircle` Backup & Restore log stream, and v2 Plugins/Messenger panels.
     - **Strict Tabler Iconography**: Replaced 100% of `solid-icons/{bs,fi,si,cg,oc,io,fa,ti,bi,ai}` imports and UI emojis across `src/pages/manage` and `src/pages/login` with `solid-icons/tb` (`.ol-ico`).
   - **Rationale**: Delivers a cohesive, quiet, high-density operator console across all management modules with zero icon-family fragmentation or decorative clutter.

### Phase 4 Verification Summary

- Icon & Emoji Audit: `rg` across `src/pages/manage` and `src/pages/login` confirms `0` non-`solid-icons/tb` icon imports and `0` Emoji UI glyphs.
- Typecheck & Production Build (`modernize/phase-4-admin-console`): `npx tsc --noEmit`, `pnpm lint`, and `pnpm build` PASS cleanly.
