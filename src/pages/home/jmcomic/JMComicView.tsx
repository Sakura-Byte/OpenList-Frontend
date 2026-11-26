import {
  For,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js"
import { Portal } from "solid-js/web"
import { LinkWithBase } from "~/components"
import {
  IArrowDown,
  IArrowUp,
  IClose,
  IDownload,
  IList,
  IRefresh,
} from "~/components/icons-tb"
import { useRouter, useTitle } from "~/hooks"
import { getSetting, me, objStore, password } from "~/store"
import type { Resp } from "~/types"
import type { JMManifest, JMPage } from "~/types/jmcomic"
import { encodePath, joinBase, r } from "~/utils"
import {
  buildBreadcrumbJsonLd,
  isJMComicEphemeralPath,
  resolveAbsoluteUrl,
  setCanonicalLink,
  setDescriptionMeta,
  setJsonLd,
  setOpenGraphMeta,
  setRobotsMeta,
} from "~/utils/seo"
import { ExportControls } from "./ExportControls"
import { useJMTranslation } from "./i18n"
import "./reader.css"
import { restoreMoves } from "./restore"
import "./work-page.css"

interface Progress {
  chapter_id: string
  page: number
  total?: number
  done_chapters?: string[]
}

const albumPositions = new Map<string, number>()

const progressKey = (m: JMManifest) =>
  `jm_progress_${me().id ?? 0}_${m.source}_${m.album_id}`

function readProgress(m: JMManifest): Progress | undefined {
  try {
    const p = JSON.parse(localStorage.getItem(progressKey(m)) ?? "null")
    if (
      p &&
      typeof p.chapter_id === "string" &&
      Number.isInteger(p.page) &&
      p.page >= 0
    ) {
      return p
    }
  } catch {
    /* Browsing still works when storage is unavailable. */
  }
}

function writeProgress(
  m: JMManifest,
  chapterId: string,
  page: number,
  total: number,
) {
  try {
    const prev = readProgress(m)
    const doneSet = new Set<string>(prev?.done_chapters ?? [])
    if (total > 0 && page >= total - 1) {
      doneSet.add(chapterId)
    }
    const next: Progress = {
      chapter_id: chapterId,
      page,
      total,
      done_chapters: Array.from(doneSet),
    }
    localStorage.setItem(progressKey(m), JSON.stringify(next))
  } catch {
    /* Optional local progress. */
  }
}

function ReaderPage(props: {
  page: JMPage
  index: number
  active: boolean
  refresh: () => void
  register: (index: number, element: HTMLDivElement) => void
}) {
  const t = useJMTranslation()
  const [ratio, setRatio] = createSignal("1000 / 1400")
  const [state, setState] = createSignal<"loading" | "ready" | "error">(
    "loading",
  )
  const [attempt, setAttempt] = createSignal(0)
  let canvas!: HTMLCanvasElement
  let image: HTMLImageElement | undefined
  let generation = 0

  const release = () => {
    generation++
    if (image) {
      image.onload = null
      image.onerror = null
      image.src = ""
      image = undefined
    }
    if (canvas) {
      canvas.width = 1
      canvas.height = 1
    }
  }

  createEffect(() => {
    const active = props.active
    attempt()
    release()
    if (!active || props.page.gif) return
    setState("loading")
    const current = generation
    const img = new Image()
    image = img
    img.referrerPolicy = "no-referrer"
    img.onload = () => {
      if (generation !== current || !canvas) return
      const width = img.naturalWidth
      const height = img.naturalHeight
      if (!width || !height) {
        setState("error")
        return
      }
      setRatio(`${width} / ${height}`)
      const scale = Math.min(
        1,
        16000 / height,
        4096 / width,
        Math.sqrt(8000000 / (width * height)),
      )
      canvas.width = Math.max(1, Math.floor(width * scale))
      canvas.height = Math.max(1, Math.floor(height * scale))
      const context = canvas.getContext("2d")
      if (!context) {
        setState("error")
        return
      }
      const sx = canvas.width / width
      const sy = canvas.height / height
      for (const move of restoreMoves(height, props.page.segments)) {
        if (move.height) {
          context.drawImage(
            img,
            0,
            move.source,
            width,
            move.height,
            0,
            move.target * sy,
            width * sx,
            move.height * sy,
          )
        }
      }
      img.onload = null
      img.onerror = null
      image = undefined
      setState("ready")
    }
    img.onerror = () => {
      if (generation === current) setState("error")
    }
    img.src = props.page.url
    onCleanup(release)
  })

  onCleanup(release)

  return (
    <div
      ref={(element) => props.register(props.index, element)}
      class="jm-page"
      data-jm-page={props.index + 1}
      style={{ "aspect-ratio": ratio() }}
    >
      <Show
        when={props.active}
        fallback={
          <div class="jm-page__status ol-tabular">{props.index + 1}</div>
        }
      >
        <Show
          when={props.page.gif}
          fallback={
            <canvas
              ref={canvas}
              aria-label={`${t("page")} ${props.index + 1}`}
              style={{
                width: "100%",
                height: "100%",
                display: state() === "ready" ? "block" : "none",
              }}
            />
          }
        >
          <Show when={{ attempt: attempt() }} keyed>
            {(_attempt) => (
              <img
                src={props.page.url}
                referrerPolicy="no-referrer"
                alt={`${t("page")} ${props.index + 1}`}
                style={{ width: "100%", height: "auto", display: "block" }}
                onLoad={(event) => {
                  setRatio(
                    `${event.currentTarget.naturalWidth} / ${event.currentTarget.naturalHeight}`,
                  )
                  setState("ready")
                }}
                onError={() => setState("error")}
              />
            )}
          </Show>
        </Show>

        <Show when={state() !== "ready"}>
          <div
            class="jm-page__status"
            role={state() === "error" ? "alert" : "status"}
            onClick={(e) => e.stopPropagation()}
          >
            <span>
              {state() === "error" ? t("image_failed") : t("loading")}
            </span>
            <Show when={state() === "error"}>
              <div style={{ display: "flex", "flex-wrap": "wrap", gap: "8px" }}>
                <button
                  type="button"
                  class="ol-btn"
                  onClick={() => {
                    setState("loading")
                    setAttempt(attempt() + 1)
                  }}
                >
                  {t("retry")}
                </button>
                <button type="button" class="ol-btn" onClick={props.refresh}>
                  {t("refresh_metadata")}
                </button>
              </div>
            </Show>
          </div>
        </Show>
      </Show>
    </div>
  )
}

function buildJMDescription(m: JMManifest): string {
  const parts = [
    `JM${m.album_id}`,
    m.authors?.length ? m.authors.join(", ") : "",
    m.tags?.length ? m.tags.join(", ") : "",
    m.description ? m.description.replace(/\s+/g, " ").trim() : "",
  ].filter(Boolean)
  const text = parts.join(" · ")
  const chars = Array.from(text)
  if (chars.length <= 180) return text
  return `${chars.slice(0, 177).join("").trimEnd()}...`
}

function ChapterReader(props: { manifest: JMManifest; refresh: () => void }) {
  const m = props.manifest
  const t = useJMTranslation()
  const { to, pathname, searchParams } = useRouter()
  const saved = readProgress(m)
  const requested = Number(searchParams.reader_page)
  const start = Math.max(
    0,
    Math.min(
      Math.max(0, m.pages.length - 1),
      Number.isInteger(requested) && requested > 0
        ? requested - 1
        : saved && saved.chapter_id === m.chapter_id
          ? saved.page
          : 0,
    ),
  )

  const [current, setCurrent] = createSignal(start)
  const [chrome, setChrome] = createSignal(true)
  const [drawerOpen, setDrawerOpen] = createSignal(false)

  const chapterIndex = m.chapters.findIndex((c) => c.id === m.chapter_id)
  const chapterName = m.chapters[chapterIndex]?.name
  const hasPrev = () => chapterIndex > 0
  const hasNext = () =>
    chapterIndex >= 0 && chapterIndex < m.chapters.length - 1

  useTitle(() => {
    const siteTitle = getSetting("site_title")
    const pageTitle = chapterName ? `${chapterName} - ${m.title}` : m.title
    return siteTitle ? `${pageTitle} | ${siteTitle}` : pageTitle
  })

  setRobotsMeta("noindex, follow")
  onCleanup(() => {
    setRobotsMeta(
      searchParams["view"] === "reader" ||
        searchParams["view"] === "files" ||
        isJMComicEphemeralPath(pathname())
        ? "noindex, follow"
        : null,
    )
  })

  let scroller: HTMLDivElement | undefined
  const blocks: HTMLDivElement[] = []
  let frame = 0
  let initialFrame = 0
  let lastY = 0

  const save = () => {
    if (!m.chapter_id) return
    writeProgress(m, m.chapter_id, current(), m.pages.length)
  }

  const jump = (pageOneBased: number) => {
    if (!m.pages.length) return
    const index = Math.max(0, Math.min(m.pages.length - 1, pageOneBased - 1))
    setCurrent(index)
    blocks[index]?.scrollIntoView({ block: "start" })
    save()
  }

  const onScroll = () => {
    if (!scroller || frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const y = scroller!.scrollTop
      if (Math.abs(y - lastY) > 12) {
        setChrome(y < lastY || y < 40)
        lastY = y
      }
      const line = scroller!.clientHeight * 0.4
      let low = 0
      let high = blocks.length
      while (low < high) {
        const mid = (low + high) >> 1
        if ((blocks[mid]?.getBoundingClientRect().top ?? Infinity) <= line) {
          low = mid + 1
        } else {
          high = mid
        }
      }
      const index = Math.max(0, low - 1)
      if (current() !== index) {
        setCurrent(index)
      }
    })
  }

  const backToWork = () => {
    save()
    to(encodePath(m.album_path, true))
  }

  const openChapter = (index: number) => {
    const chapter = m.chapters[index]
    if (chapter) {
      save()
      setDrawerOpen(false)
      to(`${encodePath(chapter.path, true)}?view=reader`)
    }
  }

  onMount(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    initialFrame = requestAnimationFrame(() => jump(start + 1))
    const timer = window.setInterval(save, 1000)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        if (drawerOpen()) {
          setDrawerOpen(false)
        } else {
          backToWork()
        }
      }
    }
    window.addEventListener("keydown", onKey, true)

    onCleanup(() => {
      save()
      window.clearInterval(timer)
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey, true)
      cancelAnimationFrame(frame)
      cancelAnimationFrame(initialFrame)
    })
  })

  return (
    <Portal>
      <div class="ol-modern-scope jm-reader" data-chrome={chrome()}>
        <header class="jm-bar jm-bar--top" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            class="ol-icon-btn"
            title={`${t("back")} (Esc)`}
            aria-label={t("back")}
            onClick={backToWork}
          >
            <IClose size={18} />
          </button>

          <div class="jm-bar__title">
            <b>{m.title}</b>
            <Show when={m.chapters.length > 1 && chapterName}>
              <span>{chapterName}</span>
            </Show>
          </div>

          <Show when={m.mode === "server" && m.chapters[chapterIndex]}>
            <button
              type="button"
              class="ol-btn ol-btn--ghost"
              onClick={() =>
                to(
                  `${encodePath(m.chapters[chapterIndex].path, true)}?view=files`,
                )
              }
            >
              {t("files_short")}
            </button>
          </Show>

          <button
            type="button"
            class="ol-icon-btn"
            title={t("chapters_and_export")}
            aria-label={t("chapters_and_export")}
            aria-pressed={drawerOpen()}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <IList size={18} />
          </button>

          <span class="jm-bar__page ol-tabular" aria-live="polite">
            {m.pages.length ? `${current() + 1} / ${m.pages.length}` : "0 / 0"}
          </span>
        </header>

        <Show when={drawerOpen()}>
          <div class="jm-drawer" onClick={(e) => e.stopPropagation()}>
            <Show when={m.chapters.length > 1}>
              <div class="jm-drawer__section">
                <div class="jm-drawer__head">
                  {t("chapters_title")} ({m.chapters.length})
                </div>
                <div class="jm-drawer-chapters">
                  <For each={m.chapters}>
                    {(ch, idx) => (
                      <button
                        type="button"
                        class="jm-drawer-ch"
                        data-active={idx() === chapterIndex}
                        onClick={() => openChapter(idx())}
                      >
                        <span class="ol-tabular" style={{ opacity: 0.6 }}>
                          {String(idx() + 1).padStart(3, "0")}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            "text-overflow": "ellipsis",
                            "white-space": "nowrap",
                          }}
                        >
                          {ch.name}
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>
            <div class="jm-drawer__section">
              <div class="jm-drawer__head">{t("export_btn")}</div>
              <ExportControls manifest={m} />
            </div>
          </div>
        </Show>

        <div
          class="jm-pages"
          ref={scroller}
          onScroll={onScroll}
          onClick={() => {
            if (drawerOpen()) setDrawerOpen(false)
            else setChrome((v) => !v)
          }}
        >
          <Show
            when={m.pages.length > 0}
            fallback={
              <div class="jm-end">
                <span>{t("empty")}</span>
              </div>
            }
          >
            <For each={m.pages}>
              {(page, index) => (
                <ReaderPage
                  page={page}
                  index={index()}
                  active={Math.abs(index() - current()) <= 2}
                  register={(i, element) => {
                    blocks[i] = element
                  }}
                  refresh={props.refresh}
                />
              )}
            </For>

            <div class="jm-end" onClick={(e) => e.stopPropagation()}>
              <Show
                when={hasNext()}
                fallback={
                  <>
                    <span>{t("last_chapter_end")}</span>
                    <button type="button" class="ol-btn" onClick={backToWork}>
                      {t("back")}
                    </button>
                  </>
                }
              >
                <span>{t("chapter_end")}</span>
                <button
                  type="button"
                  class="ol-btn ol-btn--primary"
                  onClick={() => openChapter(chapterIndex + 1)}
                >
                  {t("next")}：{m.chapters[chapterIndex + 1]?.name}
                </button>
              </Show>
            </div>
          </Show>
        </div>

        <footer
          class="jm-bar jm-bar--bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            class="ol-btn ol-btn--ghost"
            disabled={!hasPrev()}
            onClick={() => openChapter(chapterIndex - 1)}
          >
            {t("previous")}
          </button>
          <input
            class="jm-slider"
            type="range"
            min={1}
            max={Math.max(1, m.pages.length)}
            value={Math.min(Math.max(1, m.pages.length), current() + 1)}
            aria-label={t("page")}
            disabled={m.pages.length <= 1}
            onInput={(e) => jump(Number(e.currentTarget.value))}
          />
          <span class="jm-bar__page ol-tabular">
            {m.pages.length ? `${current() + 1} / ${m.pages.length}` : "0 / 0"}
          </span>
          <button
            type="button"
            class="ol-btn ol-btn--ghost"
            disabled={!hasNext()}
            onClick={() => openChapter(chapterIndex + 1)}
          >
            {t("next")}
          </button>
        </footer>
      </div>
    </Portal>
  )
}

function WorkPage(props: { manifest: JMManifest; refresh: () => void }) {
  const m = props.manifest
  const [coverFailed, setCoverFailed] = createSignal(false)
  const [expanded, setExpanded] = createSignal(false)
  const [reverse, setReverse] = createSignal(false)
  const [showExport, setShowExport] = createSignal(false)
  const t = useJMTranslation()
  const { to, pathname } = useRouter()

  useTitle(() => {
    const siteTitle = getSetting("site_title")
    return siteTitle ? `${m.title} | ${siteTitle}` : m.title
  })

  const saved = readProgress(m)
  const doneSet = new Set<string>(saved?.done_chapters ?? [])
  const resumeIndex = m.chapters.findIndex((c) => c.id === saved?.chapter_id)
  const resume = resumeIndex >= 0 ? m.chapters[resumeIndex] : undefined
  const singleChapter = () => m.chapters.length <= 1

  const positionKey = `${m.source}:${m.album_id}:${pathname()}`
  onMount(() => {
    const frame = requestAnimationFrame(() => {
      const top = albumPositions.get(positionKey)
      if (top !== undefined) window.scrollTo({ top })
    })
    onCleanup(() => {
      cancelAnimationFrame(frame)
      albumPositions.set(positionKey, window.scrollY)
    })
  })

  const open = (path: string, page?: number) => {
    albumPositions.set(positionKey, window.scrollY)
    to(
      `${encodePath(path, true)}?view=reader${page !== undefined ? `&reader_page=${page + 1}` : ""}`,
    )
  }

  const primaryLabel = () => {
    if (!resume || !saved) return t("start")
    const pageStr = t("page_num").replace("{{page}}", String(saved.page + 1))
    if (singleChapter()) {
      return `${t("continue")} · ${pageStr}`
    }
    const chLabel = resume.name || `第 ${resumeIndex + 1} 话`
    return `${t("continue")} · ${chLabel} · ${pageStr}`
  }

  const orderedChapters = createMemo(() => {
    const indexed = m.chapters.map((c, idx) => ({ chapter: c, idx }))
    return reverse() ? indexed.reverse() : indexed
  })

  return (
    <div class="jm-work">
      <div class="jm-hero">
        <Show
          when={m.cover && !coverFailed()}
          fallback={
            <div class="jm-cover jm-cover--placeholder">JM{m.album_id}</div>
          }
        >
          <img
            class="jm-cover"
            src={m.cover}
            referrerPolicy="no-referrer"
            alt={m.title}
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
          />
        </Show>

        <div class="jm-info">
          <div class="jm-head">
            <h1 class="jm-title">{m.title}</h1>

            <div class="jm-meta ol-tabular">
              <span>JM{m.album_id}</span>
              <Show when={m.authors?.length}>
                <span>{(m.authors ?? []).join(" / ")}</span>
              </Show>
              <Show when={m.date}>
                <span>{m.date}</span>
              </Show>
              <Show when={m.chapters.length > 1}>
                <span>
                  {t("chapters_count").replace(
                    "{{count}}",
                    String(m.chapters.length),
                  )}
                </span>
              </Show>
            </div>

            <Show when={(m.tags?.length ?? 0) > 0}>
              <div class="jm-tags">
                <For each={m.tags ?? []}>
                  {(tag) => {
                    const link = m.tag_links?.find((l) => l.name === tag)
                    return (
                      <Show
                        when={link}
                        fallback={<span class="jm-tag">{tag}</span>}
                      >
                        <LinkWithBase
                          class="jm-tag"
                          href={encodePath(link!.path, true)}
                        >
                          {tag}
                        </LinkWithBase>
                      </Show>
                    )
                  }}
                </For>
              </div>
            </Show>
          </div>

          <Show when={m.description}>
            <p class="jm-desc" data-expanded={expanded()}>
              {m.description}
            </p>
            <Show when={m.description.length > 90}>
              <button
                type="button"
                class="ol-link-btn jm-more"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded() ? t("collapse") : t("expand")}
              </button>
            </Show>
          </Show>

          <div class="jm-actions">
            <button
              type="button"
              class="ol-btn ol-btn--primary jm-read"
              disabled={!m.chapters.length}
              onClick={() => {
                const chapter = resume ?? m.chapters[0]
                if (chapter) {
                  open(chapter.path, resume ? saved?.page : undefined)
                }
              }}
            >
              <span class="jm-read__label">{primaryLabel()}</span>
            </button>

            <Show when={resume && m.chapters[0]}>
              <button
                type="button"
                class="ol-btn ol-btn--ghost"
                onClick={() => open(m.chapters[0].path, 0)}
              >
                {t("restart")}
              </button>
            </Show>

            <Show when={m.mode === "server"}>
              <button
                type="button"
                class="ol-btn ol-btn--ghost"
                title={t("files")}
                onClick={() =>
                  to(`${encodePath(m.album_path, true)}?view=files`)
                }
              >
                <IList size={15} />
                {t("files_short")}
              </button>
            </Show>

            <Show when={m.chapters.length > 0}>
              <button
                type="button"
                class="ol-btn ol-btn--ghost"
                aria-expanded={showExport()}
                onClick={() => setShowExport((v) => !v)}
              >
                <IDownload size={15} />
                {t("export_btn")}
              </button>
            </Show>
          </div>
        </div>
      </div>

      <Show when={showExport()}>
        <div class="jm-export-panel">
          <ExportControls manifest={m} />
        </div>
      </Show>

      <Show when={m.unavailable}>
        <div class="jm-stale-banner" role="status">
          <span>
            {m.chapters.length
              ? t("work_details_stale")
              : t("work_unavailable")}
          </span>
          <button type="button" class="ol-btn" onClick={props.refresh}>
            <IRefresh size={14} />
            {t("refresh_work_metadata")}
          </button>
        </div>
      </Show>

      <Show when={m.chapters.length > 0}>
        <div class="jm-ch-head">
          <span>
            {t("chapters_title")} ({m.chapters.length})
          </span>
          <Show when={m.chapters.length > 1}>
            <button
              type="button"
              class="ol-sort"
              onClick={() => setReverse((v) => !v)}
            >
              {reverse() ? t("order_desc") : t("order_asc")}
              {reverse() ? <IArrowUp size={12} /> : <IArrowDown size={12} />}
            </button>
          </Show>
        </div>

        <div class="jm-chapters ol-nav-body">
          <For each={orderedChapters()}>
            {({ chapter, idx }) => {
              const isCurrent = () => saved?.chapter_id === chapter.id
              const isDone = () => doneSet.has(chapter.id) && !isCurrent()
              const stateText = () => {
                if (isCurrent() && saved) {
                  const totalSuffix = saved.total ? `/${saved.total}` : ""
                  return `${t("read_to")} ${saved.page + 1}${totalSuffix}`
                }
                if (isDone()) return t("chapter_done")
                return ""
              }
              return (
                <button
                  type="button"
                  class="jm-ch"
                  data-current={isCurrent()}
                  data-done={isDone()}
                  onClick={() => open(chapter.path)}
                >
                  <span class="jm-ch__no ol-tabular">
                    {String(idx + 1).padStart(3, "0")}
                  </span>
                  <span class="jm-ch__name">{chapter.name}</span>
                  <span class="jm-ch__state ol-tabular">{stateText()}</span>
                </button>
              )
            }}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default function JMComicView() {
  const { pathname } = useRouter()
  const t = useJMTranslation()
  const [revision, setRevision] = createSignal(0)
  let controller: AbortController | undefined
  const source = createMemo(() => ({ path: pathname(), revision: revision() }))

  const [manifest] = createResource(source, async (request) => {
    controller?.abort()
    controller = new AbortController()
    const response: Resp<JMManifest> = await r.post(
      "/fs/other",
      {
        path: request.path,
        password: password(),
        method: "jm_reader",
        data: { refresh: request.revision > 0 },
      },
      { signal: controller.signal },
    )
    if (response.code !== 200) throw new Error(response.message)
    return response.data
  })

  createEffect(() => {
    const m = manifest()
    if (!m) return
    const desc = buildJMDescription(m)
    setDescriptionMeta(desc)
    const canonicalRel = m.canonical_path
      ? joinBase(encodePath(m.canonical_path, true))
      : joinBase(encodePath(pathname(), true))
    if (objStore.reader?.kind !== "chapter") {
      const siteTitle = getSetting("site_title") || "OpenList"
      setCanonicalLink(canonicalRel)
      setOpenGraphMeta({
        title: `${m.title} | ${siteTitle}`,
        description: desc,
        url: canonicalRel,
        type: "article",
        siteName: siteTitle,
        image: m.cover || null,
      })
      setJsonLd({
        "@context": "https://schema.org",
        "@graph": [
          buildBreadcrumbJsonLd(pathname(), siteTitle, (p) =>
            joinBase(encodePath(p, true)),
          ),
          {
            "@type": "CreativeWork",
            name: m.title,
            description: desc,
            author: m.authors ?? undefined,
            url: resolveAbsoluteUrl(canonicalRel),
          },
        ],
      })
    }
  })

  onCleanup(() => {
    controller?.abort()
    setDescriptionMeta(null)
  })

  const refresh = () => setRevision(revision() + 1)

  return (
    <Show
      when={!manifest.loading}
      fallback={
        <div class="ol-empty" role="status">
          {t("loading")}
        </div>
      }
    >
      <Show
        when={!manifest.error}
        fallback={
          <div class="ol-empty" role="alert">
            <div style={{ "margin-bottom": "10px" }}>
              {manifest.error?.message ?? t("request_failed")}
            </div>
            <button type="button" class="ol-btn" onClick={refresh}>
              <IRefresh size={14} />
              {t("retry")}
            </button>
          </div>
        }
      >
        <Show when={manifest()} keyed>
          {(m) =>
            objStore.reader?.kind === "chapter" ? (
              <ChapterReader manifest={m} refresh={refresh} />
            ) : (
              <WorkPage manifest={m} refresh={refresh} />
            )
          }
        </Show>
      </Show>
    </Show>
  )
}
