import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
} from "@hope-ui/solid"
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { useRouter } from "~/hooks"
import { me, objStore, password } from "~/store"
import { encodePath, r } from "~/utils"
import type { Resp } from "~/types"
import type { JMManifest, JMPage } from "~/types/jmcomic"
import { useJMTranslation } from "./i18n"
import { restoreMoves } from "./restore"
import "./work-page.css"
import { ExportControls } from "./ExportControls"
import { LinkWithBase } from "~/components"

interface Progress {
  chapter_id: string
  page: number
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
    )
      return p
  } catch {
    /* Browsing still works when storage is unavailable. */
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
    // No pixel reads or export: drawImage also works on a tainted canvas.
    img.referrerPolicy = "no-referrer"
    img.onload = () => {
      if (generation !== current || !canvas) return
      const width = img.naturalWidth,
        height = img.naturalHeight
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
      const sx = canvas.width / width,
        sy = canvas.height / height
      for (const move of restoreMoves(height, props.page.segments)) {
        if (move.height)
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
      data-jm-page={props.index + 1}
      style={{
        width: "100%",
        "aspect-ratio": ratio(),
        position: "relative",
        "background-color": "var(--hope-colors-neutral3)",
        overflow: "hidden",
      }}
    >
      <Show when={props.active}>
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
                style={{ width: "100%", height: "auto" }}
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
          <VStack
            position="absolute"
            top="0"
            left="0"
            w="$full"
            h="$full"
            justifyContent="center"
            p="$4"
            spacing="$3"
          >
            <Text role={state() === "error" ? "alert" : "status"}>
              {state() === "error" ? t("image_failed") : t("loading")}
            </Text>
            <Show when={state() === "error"}>
              <HStack flexWrap="wrap" gap="$2">
                <Button
                  onClick={() => {
                    setState("loading")
                    setAttempt(attempt() + 1)
                  }}
                >
                  {t("retry")}
                </Button>
                <Button onClick={props.refresh}>{t("refresh_metadata")}</Button>
              </HStack>
            </Show>
          </VStack>
        </Show>
      </Show>
    </div>
  )
}

function ChapterReader(props: { manifest: JMManifest; refresh: () => void }) {
  const m = props.manifest
  const t = useJMTranslation()
  const { to, searchParams } = useRouter()
  const saved = readProgress(m)
  const requested = Number(searchParams.reader_page)
  const start = Math.max(
    0,
    Math.min(
      m.pages.length - 1,
      Number.isInteger(requested) && requested > 0
        ? requested - 1
        : saved && saved.chapter_id === m.chapter_id
          ? saved.page
          : 0,
    ),
  )
  const [current, setCurrent] = createSignal(start)
  const [jumpPage, setJumpPage] = createSignal(start + 1)
  const chapterIndex = m.chapters.findIndex((c) => c.id === m.chapter_id)
  const blocks: HTMLDivElement[] = []
  let frame = 0
  let initialFrame = 0
  const save = () => {
    try {
      localStorage.setItem(
        progressKey(m),
        JSON.stringify({ chapter_id: m.chapter_id, page: current() }),
      )
    } catch {
      /* Optional local progress. */
    }
  }
  const jump = (page: number) => {
    const index = Math.max(0, Math.min(m.pages.length - 1, page - 1))
    setCurrent(index)
    setJumpPage(index + 1)
    blocks[index]?.scrollIntoView({ block: "start" })
    save()
  }
  const scroll = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      let low = 0,
        high = blocks.length
      while (low < high) {
        const mid = Math.floor((low + high) / 2)
        if (blocks[mid]?.getBoundingClientRect().top <= 140) low = mid + 1
        else high = mid
      }
      const index = Math.max(0, low - 1)
      if (current() !== index) {
        setCurrent(index)
        setJumpPage(index + 1)
      }
    })
  }
  onMount(() => {
    initialFrame = requestAnimationFrame(() => jump(start + 1))
    window.addEventListener("scroll", scroll, { passive: true })
    const timer = setInterval(save, 1000)
    onCleanup(() => {
      save()
      clearInterval(timer)
      window.removeEventListener("scroll", scroll)
      cancelAnimationFrame(frame)
      cancelAnimationFrame(initialFrame)
    })
  })
  const openChapter = (index: number) => {
    const chapter = m.chapters[index]
    if (chapter) to(`${encodePath(chapter.path, true)}?view=reader`)
  }
  return (
    <VStack w="$full" spacing="$3">
      <HStack
        w="$full"
        flexWrap="wrap"
        gap="$2"
        p="$2"
        position="sticky"
        top="0"
        zIndex="$sticky"
        bg="$background"
      >
        <Button onClick={() => to(encodePath(m.album_path, true))}>
          {t("back")}
        </Button>
        <Button
          disabled={chapterIndex <= 0}
          onClick={() => openChapter(chapterIndex - 1)}
        >
          {t("previous")}
        </Button>
        <Text aria-live="polite">
          {m.chapters[chapterIndex]?.name} · {current() + 1}/{m.pages.length}
        </Text>
        <Input
          type="number"
          aria-label={t("page")}
          min={1}
          max={m.pages.length}
          value={jumpPage()}
          onInput={(event) => setJumpPage(Number(event.currentTarget.value))}
          w="$20"
        />
        <Button
          onClick={() => {
            if (Number.isFinite(jumpPage())) jump(jumpPage())
          }}
        >
          {t("jump")}
        </Button>
        <Button
          disabled={chapterIndex < 0 || chapterIndex >= m.chapters.length - 1}
          onClick={() => openChapter(chapterIndex + 1)}
        >
          {t("next")}
        </Button>
        <Show when={m.mode === "server"}>
          <Button
            onClick={() =>
              to(
                `${encodePath(m.chapters[chapterIndex].path, true)}?view=files`,
              )
            }
          >
            {t("files")}
          </Button>
        </Show>
      </HStack>
      <Show when={m.pages.length > 0} fallback={<Text>{t("empty")}</Text>}>
        <ExportControls manifest={m} />
        <Box w="$full" maxW="1000px">
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
        </Box>
      </Show>
    </VStack>
  )
}

function WorkPage(props: { manifest: JMManifest; refresh: () => void }) {
  const m = props.manifest
  const [coverFailed, setCoverFailed] = createSignal(false)
  const t = useJMTranslation()
  const { to, pathname } = useRouter()
  const saved = readProgress(m)
  const resume = m.chapters.find((c) => c.id === saved?.chapter_id)
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
  return (
    <VStack w="$full" alignItems="start" spacing="$4" p="$3">
      <div class="jm-work-header">
        <VStack class="jm-work-info" alignItems="start" spacing="$2">
          <Heading>{m.title}</Heading>
          <Text>
            JM{m.album_id} · {m.date} · {(m.authors ?? []).join(" / ")}
          </Text>
          <div class="jm-work-tags">
            <For each={m.tags ?? []}>
              {(tag) => {
                const link = m.tag_links?.find((link) => link.name === tag)
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
          <HStack flexWrap="wrap" gap="$2">
            <Button
              colorScheme="accent"
              disabled={!m.chapters.length}
              onClick={() => {
                const chapter = resume ?? m.chapters[0]
                if (chapter)
                  open(chapter.path, resume ? saved?.page : undefined)
              }}
            >
              {resume ? t("continue") : t("start")}
            </Button>
            <Show when={m.mode === "server"}>
              <Button
                onClick={() =>
                  to(`${encodePath(m.album_path, true)}?view=files`)
                }
              >
                {t("files")}
              </Button>
            </Show>
          </HStack>
        </VStack>
        <Show when={m.cover && !coverFailed()}>
          <img
            class="jm-work-cover"
            src={m.cover}
            referrerPolicy="no-referrer"
            alt={m.title}
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
          />
        </Show>
      </div>
      <Text css={{ "white-space": "pre-wrap", "overflow-wrap": "anywhere" }}>
        {m.description}
      </Text>
      <ExportControls manifest={m} />
      <Show when={m.unavailable}>
        <Text role="status">
          {m.chapters.length ? t("work_details_stale") : t("work_unavailable")}
        </Text>
        <Button onClick={props.refresh}>{t("refresh_work_metadata")}</Button>
      </Show>
      <Heading size="base">
        {t("chapters_title")} ({m.chapters.length})
      </Heading>
      <VStack w="$full" spacing="$2">
        <For each={m.chapters}>
          {(chapter, index) => (
            <Button
              w="$full"
              justifyContent="start"
              onClick={() => open(chapter.path)}
            >
              {String(index() + 1).padStart(3, "0")} · {chapter.name}
            </Button>
          )}
        </For>
      </VStack>
    </VStack>
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
  onCleanup(() => controller?.abort())
  const refresh = () => setRevision(revision() + 1)
  return (
    <Show
      when={!manifest.loading}
      fallback={<Text role="status">{t("loading")}</Text>}
    >
      <Show
        when={!manifest.error}
        fallback={
          <VStack>
            <Text role="alert">
              {manifest.error?.message ?? t("request_failed")}
            </Text>
            <Button onClick={refresh}>{t("retry")}</Button>
          </VStack>
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
