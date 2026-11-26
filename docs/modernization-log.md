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
