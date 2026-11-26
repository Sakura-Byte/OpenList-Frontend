import {
  For,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  onCleanup,
} from "solid-js"
import { Markdown } from "~/components"
import {
  IClose,
  IDownload,
  IFilePlus,
  IList,
  IPause,
  IPlay,
  ISkipBack,
  ISkipForward,
} from "~/components/icons-tb"
import { getLinkByDirAndObj, useLink, useRouter, useT } from "~/hooks"
import { objStore, password } from "~/store"
import { AsmrWorkMeta, Obj, ObjType } from "~/types"
import { fetchText, fsList, notify, pathJoin } from "~/utils"
import "../jmcomic/work-page.css"
import "./asmr.css"

export interface AsmrTrackItem {
  title: string
  url: string
  subUrl?: string
  artist?: string
  album?: string
  cover?: string
}

interface SubtitleCue {
  start: number
  end: number
  text: string
}

const AUDIO_EXT_RE = /\.(mp3|flac|wav|m4a|ogg|opus|aac|wma)$/i
const SUB_EXT_RE = /\.(lrc|vtt)$/i
const PLAYBACK_RATES = [1.0, 1.25, 1.5, 2.0] as const

export function isAudioFilename(name: string, type?: number): boolean {
  return type === ObjType.AUDIO || AUDIO_EXT_RE.test(name)
}

function stripExt(name: string): string {
  const idx = name.lastIndexOf(".")
  return idx > 0 ? name.slice(0, idx) : name
}

function findMatchingSubtitleObj(
  audioName: string,
  siblings: Obj[],
): Obj | undefined {
  const lowerFull = audioName.toLowerCase()
  const lowerStem = stripExt(audioName).toLowerCase()
  return siblings.find((s) => {
    if (s.is_dir || !SUB_EXT_RE.test(s.name)) return false
    const cand = s.name.toLowerCase()
    const candStem = stripExt(cand)
    return (
      candStem === lowerFull ||
      candStem === lowerStem ||
      stripExt(candStem) === lowerStem
    )
  })
}

function parseTimestampSec(raw: string): number {
  const parts = raw.trim().replace(",", ".").split(":")
  if (parts.length === 3) {
    return (
      Number(parts[0]) * 3600 + Number(parts[1]) * 60 + parseFloat(parts[2])
    )
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + parseFloat(parts[1])
  }
  return 0
}

export function parseSubtitleCues(text: string): SubtitleCue[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const cues: SubtitleCue[] = []

  // VTT format check
  if (/^\s*WEBVTT/i.test(text) || text.includes("-->")) {
    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()
      const arrowIdx = line.indexOf("-->")
      if (arrowIdx > 0) {
        const startRaw = line.slice(0, arrowIdx).trim()
        const endRaw = line
          .slice(arrowIdx + 3)
          .trim()
          .split(/\s+/)[0]
        const start = parseTimestampSec(startRaw)
        const end = parseTimestampSec(endRaw)
        i++
        const textLines: string[] = []
        while (i < lines.length && lines[i].trim() !== "") {
          textLines.push(lines[i].trim().replace(/<[^>]+>/g, ""))
          i++
        }
        const cueText = textLines.join(" ").trim()
        if (cueText && Number.isFinite(start)) {
          cues.push({
            start,
            end: Number.isFinite(end) && end > start ? end : start + 6,
            text: cueText,
          })
        }
      } else {
        i++
      }
    }
    if (cues.length > 0) {
      return cues.sort((a, b) => a.start - b.start)
    }
  }

  // LRC format: [mm:ss.xx] lyric
  const lrcRe = /\[(\d{1,3}:\d{2}(?:[.:]\d{1,3})?)\]/g
  const rawPoints: Array<{ start: number; text: string }> = []
  for (const line of lines) {
    const stamps: number[] = []
    let match: RegExpExecArray | null
    lrcRe.lastIndex = 0
    while ((match = lrcRe.exec(line)) !== null) {
      stamps.push(parseTimestampSec(match[1]))
    }
    if (stamps.length > 0) {
      const lyric = line.replace(lrcRe, "").trim()
      if (lyric) {
        stamps.forEach((st) => rawPoints.push({ start: st, text: lyric }))
      }
    }
  }
  rawPoints.sort((a, b) => a.start - b.start)
  for (let idx = 0; idx < rawPoints.length; idx++) {
    const nextStart = rawPoints[idx + 1]?.start
    cues.push({
      start: rawPoints[idx].start,
      end: nextStart !== undefined ? nextStart : rawPoints[idx].start + 8,
      text: rawPoints[idx].text,
    })
  }
  return cues
}

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "00:00"
  const total = Math.floor(sec)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function parseSynthesizedAsmrReadme(raw: string): AsmrWorkMeta | null {
  if (!raw || !raw.trim()) return null
  const titleMatch = raw.match(/^#\s+(.+)$/m)
  const coverMatch = raw.match(/!\[Cover\]\(([^)]+)\)/i)
  const idMatch = raw.match(/^-\s*ID:\s*(.+)$/m)
  const circleMatch = raw.match(/^-\s*Circle:\s*(.+)$/m)
  const releaseMatch = raw.match(/^-\s*Release:\s*(.+)$/m)
  const vaMatch = raw.match(/^-\s*Voice actors:\s*(.+)$/m)
  const tagsMatch = raw.match(/^-\s*Tags:\s*(.+)$/m)

  let intro = raw
    .replace(/^#\s+.+$/m, "")
    .replace(/!\[Cover\]\([^)]+\)/i, "")
    .replace(/^-\s*(ID|API ID|Circle|Release|Voice actors|Tags):.*$/gm, "")
    .trim()

  return {
    source_id: idMatch?.[1]?.trim() || "",
    title: titleMatch?.[1]?.trim() || "",
    cover: coverMatch?.[1]?.trim() || "",
    circle: circleMatch?.[1]?.trim() || "",
    release: releaseMatch?.[1]?.trim() || "",
    vas: vaMatch?.[1]
      ? vaMatch[1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    tags: tagsMatch?.[1]
      ? tagsMatch[1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    introduction: intro,
  }
}

// Module-level inline audio queue so playback persists across subfolders of a work
const [queue, setQueue] = createSignal<AsmrTrackItem[]>([])
const [currentIndex, setCurrentIndex] = createSignal(0)
const [playing, setPlaying] = createSignal(false)
const [autoPlayTrigger, setAutoPlayTrigger] = createSignal(0)

export function hasActiveAsmrQueue() {
  return queue().length > 0
}

export function playAsmrTracks(tracks: AsmrTrackItem[], startIndex = 0) {
  if (tracks.length === 0) return
  setQueue(tracks)
  setCurrentIndex(Math.max(0, Math.min(tracks.length - 1, startIndex)))
  setPlaying(true)
  setAutoPlayTrigger((n) => n + 1)
}

export function playObjInCurrentAsmrFolder(
  targetObj: Obj,
  dir: string,
  isShare: boolean,
) {
  const siblings = objStore.objs
  const audioObjs = siblings.filter(
    (o) => !o.is_dir && isAudioFilename(o.name, o.type),
  )
  if (audioObjs.length === 0) return false

  const asmrMeta =
    objStore.dir_info?.extra?.asmrone_work ?? objStore.dir_info?.asmrone_work
  const coverObj = siblings.find(
    (o) => !o.is_dir && /^cover\.(jpe?g|png|webp)$/i.test(o.name),
  )
  const fallbackCover =
    asmrMeta?.cover ||
    objStore.dir_info?.cover ||
    (coverObj ? getLinkByDirAndObj(dir, coverObj, "direct", isShare, true) : "")

  const tracks: AsmrTrackItem[] = audioObjs.map((o) => {
    const subObj = findMatchingSubtitleObj(o.name, siblings)
    return {
      title: stripExt(o.name),
      url: getLinkByDirAndObj(dir, o, "direct", isShare, true),
      subUrl: subObj
        ? getLinkByDirAndObj(dir, subObj, "proxy", isShare, true)
        : undefined,
      artist: asmrMeta?.vas?.join(" / ") || asmrMeta?.circle || undefined,
      album: asmrMeta?.title || undefined,
      cover: fallbackCover || undefined,
    }
  })

  const idx = Math.max(
    0,
    audioObjs.findIndex((o) => o.name === targetObj.name),
  )
  playAsmrTracks(tracks, idx)
  return true
}

export const ASMRInlinePlayer = () => {
  const t = useT()
  let audioEl: HTMLAudioElement | undefined
  const [curTime, setCurTime] = createSignal(0)
  const [duration, setDuration] = createSignal(0)
  const [rateIdx, setRateIdx] = createSignal(0)
  const [queueOpen, setQueueOpen] = createSignal(false)
  const [cues, setCues] = createSignal<SubtitleCue[]>([])

  const currentTrack = createMemo(() => queue()[currentIndex()])
  const rate = () => PLAYBACK_RATES[rateIdx()]

  // Load track & subtitles when currentTrack or autoPlayTrigger changes
  let subSeq = 0
  createEffect(
    on([currentTrack, autoPlayTrigger], async ([track]) => {
      setCues([])
      setCurTime(0)
      setDuration(0)
      const mySeq = ++subSeq
      if (!track || !audioEl) return

      if (audioEl.src !== track.url) {
        audioEl.src = track.url
      }
      audioEl.playbackRate = rate()
      if (playing()) {
        audioEl.play().catch(() => setPlaying(false))
      }

      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album,
            artwork: track.cover ? [{ src: track.cover }] : [],
          })
        } catch {
          /* ignore unsupported MediaMetadata */
        }
      }

      if (track.subUrl) {
        const res = await fetchText(track.subUrl, false)
        if (mySeq !== subSeq) return
        const rawText =
          typeof res.content === "string"
            ? res.content
            : new TextDecoder("utf-8").decode(res.content)
        if (!rawText.startsWith("Failed to fetch")) {
          setCues(parseSubtitleCues(rawText))
        }
      }
    }),
  )

  createEffect(() => {
    const r = rate()
    if (audioEl) audioEl.playbackRate = r
  })

  createEffect(() => {
    if (!("mediaSession" in navigator)) return
    try {
      navigator.mediaSession.setActionHandler("play", () => {
        audioEl?.play()
        setPlaying(true)
      })
      navigator.mediaSession.setActionHandler("pause", () => {
        audioEl?.pause()
        setPlaying(false)
      })
      navigator.mediaSession.setActionHandler("previoustrack", () => prev())
      navigator.mediaSession.setActionHandler("nexttrack", () => next())
      navigator.mediaSession.setActionHandler("seekto", (evt) => {
        if (audioEl && typeof evt.seekTime === "number") {
          audioEl.currentTime = evt.seekTime
        }
      })
    } catch {
      /* ignore */
    }
  })

  const togglePlay = () => {
    if (!audioEl) return
    if (audioEl.paused) {
      audioEl.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      )
    } else {
      audioEl.pause()
      setPlaying(false)
    }
  }

  const prev = () => {
    if (currentIndex() > 0) {
      setCurrentIndex((i) => i - 1)
      setPlaying(true)
    } else if (audioEl) {
      audioEl.currentTime = 0
    }
  }

  const next = () => {
    if (currentIndex() < queue().length - 1) {
      setCurrentIndex((i) => i + 1)
      setPlaying(true)
    } else {
      setPlaying(false)
    }
  }

  const closePlayer = () => {
    audioEl?.pause()
    setPlaying(false)
    setQueue([])
    setCues([])
  }

  const activeLyric = createMemo(() => {
    const list = cues()
    if (!list.length) return ""
    const tNow = curTime()
    for (let i = list.length - 1; i >= 0; i--) {
      if (tNow >= list[i].start && tNow <= list[i].end) {
        return list[i].text
      }
    }
    return ""
  })

  return (
    <Show when={currentTrack()}>
      {(track) => (
        <div class="ol-asmr-player" role="region" aria-label="Audio Player">
          <audio
            ref={audioEl}
            preload="metadata"
            onTimeUpdate={(e) => setCurTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={next}
          />

          <div class="ol-asmr-player__main">
            <div class="ol-asmr-player__controls">
              <button
                type="button"
                class="ol-icon-btn"
                disabled={currentIndex() <= 0}
                onClick={prev}
                aria-label="Previous"
              >
                <ISkipBack size={16} />
              </button>
              <button
                type="button"
                class="ol-asmr-player__play"
                onClick={togglePlay}
                aria-label={
                  playing() ? t("home.asmr.pause") : t("home.asmr.play_all")
                }
              >
                {playing() ? <IPause size={16} /> : <IPlay size={16} />}
              </button>
              <button
                type="button"
                class="ol-icon-btn"
                disabled={currentIndex() >= queue().length - 1}
                onClick={next}
                aria-label="Next"
              >
                <ISkipForward size={16} />
              </button>
            </div>

            <div class="ol-asmr-player__meta">
              <div class="ol-asmr-player__title-row">
                <span class="ol-asmr-player__title" title={track().title}>
                  {track().title}
                </span>
                <span class="ol-asmr-player__time ol-tabular">
                  {formatClock(curTime())} / {formatClock(duration())} ·{" "}
                  {currentIndex() + 1}/{queue().length}
                </span>
              </div>
              <input
                type="range"
                class="ol-asmr-player__scrubber"
                min={0}
                max={Math.max(1, duration())}
                step={0.2}
                value={Math.min(curTime(), Math.max(1, duration()))}
                onInput={(e) => {
                  const nextTime = Number(e.currentTarget.value)
                  setCurTime(nextTime)
                  if (audioEl) audioEl.currentTime = nextTime
                }}
              />
            </div>

            <div class="ol-asmr-player__tools">
              <button
                type="button"
                class="ol-btn ol-btn--ghost ol-asmr-player__rate"
                onClick={() =>
                  setRateIdx((i) => (i + 1) % PLAYBACK_RATES.length)
                }
              >
                {rate().toFixed(rate() % 1 === 0 ? 1 : 2)}x
              </button>
              <button
                type="button"
                class="ol-icon-btn"
                title={t("home.asmr.queue")}
                aria-label={t("home.asmr.queue")}
                aria-pressed={queueOpen()}
                onClick={() => setQueueOpen((v) => !v)}
              >
                <IList size={16} />
              </button>
              <button
                type="button"
                class="ol-icon-btn"
                title={t("home.asmr.close_player")}
                aria-label={t("home.asmr.close_player")}
                onClick={closePlayer}
              >
                <IClose size={16} />
              </button>
            </div>
          </div>

          <Show when={activeLyric()}>
            <div class="ol-asmr-player__lyric" aria-live="polite">
              {activeLyric()}
            </div>
          </Show>

          <Show when={queueOpen()}>
            <div class="ol-asmr-queue">
              <For each={queue()}>
                {(item, idx) => (
                  <button
                    type="button"
                    class="ol-asmr-queue__item"
                    data-active={idx() === currentIndex()}
                    onClick={() => {
                      setCurrentIndex(idx())
                      setPlaying(true)
                      setAutoPlayTrigger((n) => n + 1)
                    }}
                  >
                    <span class="ol-tabular" style={{ opacity: 0.6 }}>
                      {String(idx() + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        "text-overflow": "ellipsis",
                        "white-space": "nowrap",
                      }}
                    >
                      {item.title}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      )}
    </Show>
  )
}

export const ASMRWorkView = () => {
  const t = useT()
  const { pathname, isShare } = useRouter()
  const { rawLink, proxyLink } = useLink()

  const [coverFailed, setCoverFailed] = createSignal(false)
  const [expanded, setExpanded] = createSignal(false)
  const [showReadme, setShowReadme] = createSignal(false)
  const [loadingTracks, setLoadingTracks] = createSignal(false)

  createEffect(
    on(pathname, () => {
      setCoverFailed(false)
      setExpanded(false)
      setShowReadme(false)
    }),
  )

  const structuredWork = createMemo<AsmrWorkMeta | undefined>(
    () =>
      objStore.dir_info?.extra?.asmrone_work ?? objStore.dir_info?.asmrone_work,
  )

  const isLegacyAsmrWorkDir = createMemo(() => {
    if (structuredWork()) return false
    if (objStore.provider !== "ASMR.ONE") return false
    const segs = pathname().split("/").filter(Boolean)
    const leaf = segs[segs.length - 1] ?? ""
    if (!/^(?:RJ|VJ|BJ)\d+\s+/i.test(leaf)) return false
    return objStore.objs.some(
      (o) =>
        o.name.toLowerCase() === "readme.md" ||
        o.name.toLowerCase() === "cover.jpg",
    )
  })

  const readmeObj = createMemo(() =>
    objStore.objs.find((o) => o.name.toLowerCase() === "readme.md"),
  )
  const coverObj = createMemo(() =>
    objStore.objs.find((o) => /^cover\.(jpe?g|png|webp)$/i.test(o.name)),
  )

  const [readmeRaw] = createResource(
    () =>
      (isLegacyAsmrWorkDir() || showReadme()) && readmeObj()
        ? proxyLink(readmeObj()!, true)
        : "",
    async (url) => {
      if (!url) return ""
      const res = await fetchText(url)
      return typeof res.content === "string"
        ? res.content
        : new TextDecoder("utf-8").decode(res.content)
    },
  )

  const work = createMemo<AsmrWorkMeta | null>(() => {
    const s = structuredWork()
    if (s && (s.title || s.source_id)) return s
    if (!isLegacyAsmrWorkDir()) return null
    const parsed = readmeRaw() ? parseSynthesizedAsmrReadme(readmeRaw()!) : null
    if (parsed && (parsed.title || parsed.source_id)) return parsed

    const leaf = pathname().split("/").filter(Boolean).pop() ?? ""
    const m = /^((?:RJ|VJ|BJ)\d+)\s+(.+)$/i.exec(leaf)
    return {
      source_id: m?.[1]?.toUpperCase() || "",
      title: m?.[2] || leaf,
      cover: coverObj() ? rawLink(coverObj()!, true) : "",
    }
  })

  const coverUrl = createMemo(() => {
    const w = work()
    if (!w) return ""
    if (coverObj()) return rawLink(coverObj()!, true)
    return w.cover || objStore.dir_info?.cover || ""
  })

  const gatherTracksFromFolder = async (
    dirPath: string,
    items: Obj[],
    depth = 0,
  ): Promise<AsmrTrackItem[]> => {
    const w = work()
    const out: AsmrTrackItem[] = []
    const share = isShare()

    const directAudios = items.filter(
      (o) => !o.is_dir && isAudioFilename(o.name, o.type),
    )
    for (const audio of directAudios) {
      const subObj = findMatchingSubtitleObj(audio.name, items)
      out.push({
        title: stripExt(audio.name),
        url: getLinkByDirAndObj(dirPath, audio, "direct", share, true),
        subUrl: subObj
          ? getLinkByDirAndObj(dirPath, subObj, "proxy", share, true)
          : undefined,
        artist: w?.vas?.join(" / ") || w?.circle || undefined,
        album: w?.title || undefined,
        cover: coverUrl() || undefined,
      })
    }

    if (depth < 2) {
      const subDirs = items.filter((o) => o.is_dir)
      for (const sub of subDirs) {
        const subPath = pathJoin(dirPath, sub.name)
        const resp = await fsList(subPath, password())
        if (resp.code === 200 && resp.data?.content) {
          const nested = await gatherTracksFromFolder(
            subPath,
            resp.data.content,
            depth + 1,
          )
          out.push(...nested)
        }
      }
    }
    return out
  }

  const handlePlayAll = async () => {
    if (loadingTracks()) return
    setLoadingTracks(true)
    try {
      const tracks = await gatherTracksFromFolder(pathname(), objStore.objs, 0)
      if (tracks.length === 0) {
        notify.warning(t("home.asmr.no_audio_tracks"))
        return
      }
      playAsmrTracks(tracks, 0)
    } finally {
      setLoadingTracks(false)
    }
  }

  return (
    <Show when={work()}>
      {(w) => (
        <div class="ol-asmr-work">
          <div class="ol-asmr-hero">
            <Show
              when={coverUrl() && !coverFailed()}
              fallback={
                <div class="ol-asmr-cover ol-asmr-cover--placeholder">
                  {w().source_id || "ASMR"}
                </div>
              }
            >
              <img
                class="ol-asmr-cover"
                src={coverUrl()}
                alt={w().title || ""}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setCoverFailed(true)}
              />
            </Show>

            <div class="jm-info">
              <div class="jm-head">
                <h1 class="jm-title">{w().title}</h1>

                <div class="jm-meta ol-tabular">
                  <Show when={w().source_id}>
                    <span>{w().source_id}</span>
                  </Show>
                  <Show when={w().circle}>
                    <span>{w().circle}</span>
                  </Show>
                  <Show when={w().release}>
                    <span>{w().release}</span>
                  </Show>
                </div>

                <Show when={(w().vas?.length ?? 0) > 0}>
                  <div class="ol-asmr-cv">
                    <span class="ol-asmr-cv__label">{t("home.asmr.cv")}</span>
                    <span>{(w().vas ?? []).join(" / ")}</span>
                  </div>
                </Show>

                <Show when={(w().tags?.length ?? 0) > 0}>
                  <div class="jm-tags">
                    <For each={w().tags ?? []}>
                      {(tag) => <span class="jm-tag">{tag}</span>}
                    </For>
                  </div>
                </Show>
              </div>

              <Show when={w().introduction}>
                <p class="jm-desc" data-expanded={expanded()}>
                  {w().introduction}
                </p>
                <Show when={(w().introduction?.length ?? 0) > 90}>
                  <button
                    type="button"
                    class="ol-link-btn jm-more"
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded()
                      ? t("home.asmr.collapse")
                      : t("home.asmr.expand")}
                  </button>
                </Show>
              </Show>

              <div class="jm-actions">
                <button
                  type="button"
                  class="ol-btn ol-btn--primary jm-read"
                  disabled={loadingTracks()}
                  onClick={handlePlayAll}
                >
                  <IPlay size={15} />
                  <span class="jm-read__label">
                    {loadingTracks()
                      ? t("home.asmr.loading_tracks")
                      : t("home.asmr.play_all")}
                  </span>
                </button>

                <Show when={readmeObj() || w().introduction}>
                  <button
                    type="button"
                    class="ol-btn ol-btn--ghost"
                    aria-expanded={showReadme()}
                    onClick={() => setShowReadme((v) => !v)}
                  >
                    <IFilePlus size={15} />
                    {showReadme()
                      ? t("home.asmr.hide_readme")
                      : t("home.asmr.view_readme")}
                  </button>
                </Show>

                <Show when={coverUrl()}>
                  <a
                    class="ol-btn ol-btn--ghost"
                    href={coverUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={coverObj()?.name || "cover.jpg"}
                  >
                    <IDownload size={15} />
                    {t("home.asmr.download_cover")}
                  </a>
                </Show>
              </div>
            </div>
          </div>

          <Show when={showReadme()}>
            <div class="ol-asmr-readme">
              <Markdown
                children={readmeRaw() || w().introduction || ""}
                readme
                sanitize
              />
            </div>
          </Show>
        </div>
      )}
    </Show>
  )
}
