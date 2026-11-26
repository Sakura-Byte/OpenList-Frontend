import { Box, useColorMode, useColorModeValue } from "@hope-ui/solid"
import { createStorageSignal } from "@solid-primitives/storage"
import { clsx } from "clsx"
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
} from "solid-js"
import { useParseText, useRouter, useT } from "~/hooks"
import { useScrollListener } from "~/pages/home/toolbar/BackTop"
import { getSettingBool, me } from "~/store"
import { api, pathDir, pathJoin, pathResolve } from "~/utils"
import { EncodingSelect } from "./EncodingSelect"
import "./markdown.css"

export interface TocHeading {
  level: number
  text: string
  id: string
}

export type AlertKind = "note" | "tip" | "important" | "warning" | "caution"

export interface EnhanceLabels {
  alerts: Record<AlertKind, string>
  copyCode: string
}

export interface CachedMdResult {
  html: string
  toc: TocHeading[]
  hasMermaid: boolean
}

const [isTocVisible, setVisible] = createSignal(false)
const [isTocDisabled, setTocDisabled] = createStorageSignal(
  "isMarkdownTocDisabled",
  true,
  {
    serializer: (v: boolean) => JSON.stringify(v),
    deserializer: (v) => JSON.parse(v),
  },
)

export { isTocVisible, setTocDisabled }

const ALLOWED_CSS_EXACT = new Set([
  "border-radius",
  "box-shadow",
  "background",
  "background-color",
  "background-image",
  "color",
  "display",
  "gap",
  "row-gap",
  "column-gap",
  "align-items",
  "justify-content",
  "font-weight",
  "font-size",
  "line-height",
  "text-align",
  "width",
  "max-width",
  "min-width",
  "height",
  "max-height",
  "min-height",
  "overflow",
  "overflow-x",
  "overflow-y",
  "vertical-align",
  "float",
  "clear",
])

const ALLOWED_CSS_PREFIXES = ["padding", "margin", "border", "flex", "grid"]

const DANGEROUS_CSS_RE =
  /url\s*\(|expression\s*\(|javascript:|vbscript:|@import|-moz-binding|behavior\s*:/i

const SAFE_GRADIENT_RE = /^(repeating-)?(linear|radial)-gradient\([^;{}]+\)$/i

function isAllowedCssProp(prop: string): boolean {
  if (ALLOWED_CSS_EXACT.has(prop)) return true
  return ALLOWED_CSS_PREFIXES.some(
    (prefix) => prop === prefix || prop.startsWith(`${prefix}-`),
  )
}

function srgbChannelToLinear(channel255: number): number {
  const c = Math.max(0, Math.min(255, channel255)) / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/**
 * Parse #hex or rgb()/rgba() inline CSS colors and return WCAG relative luminance [0..1].
 */
export function parseCssColorLuminance(rawVal: string): number | null {
  const v = rawVal.trim().toLowerCase()
  let r = -1
  let g = -1
  let b = -1

  if (v.startsWith("#")) {
    const hex = v.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
  } else {
    const rgbMatch = v.match(
      /^rgba?\(\s*(\d{1,3})\s*(?:,|\s)\s*(\d{1,3})\s*(?:,|\s)\s*(\d{1,3})/,
    )
    if (rgbMatch) {
      r = Number(rgbMatch[1])
      g = Number(rgbMatch[2])
      b = Number(rgbMatch[3])
    }
  }

  if (
    r < 0 ||
    g < 0 ||
    b < 0 ||
    Number.isNaN(r) ||
    Number.isNaN(g) ||
    Number.isNaN(b)
  ) {
    return null
  }
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  )
}

export function rescueDarkContrastColor(
  val: string,
  darkMode: boolean,
): string {
  if (!darkMode) return val
  if (val.includes("var(") || val.includes("color-mix(")) return val
  const lum = parseCssColorLuminance(val)
  if (lum !== null && lum < 0.18) {
    return `color-mix(in oklab, ${val} 35%, #f3f3f4)`
  }
  return val
}

export function sanitizeCssStyle(rawStyle: string, darkMode = false): string {
  if (!rawStyle || typeof rawStyle !== "string") return ""
  const cleaned = rawStyle.replace(/\/\*[\s\S]*?\*\//g, "")
  const declarations = cleaned.split(";")
  const safeParts: string[] = []

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(":")
    if (colonIdx <= 0) continue
    const prop = decl.slice(0, colonIdx).trim().toLowerCase()
    let val = decl.slice(colonIdx + 1).trim()
    if (!prop || !val) continue
    if (!isAllowedCssProp(prop)) continue
    if (DANGEROUS_CSS_RE.test(val)) continue
    if (/[{}]/.test(val)) continue

    if (prop === "background-image") {
      if (!SAFE_GRADIENT_RE.test(val)) continue
    }

    if (prop === "color") {
      val = rescueDarkContrastColor(val, darkMode)
    }

    safeParts.push(`${prop}: ${val}`)
  }

  return safeParts.join("; ")
}

let enginePromise: Promise<typeof import("./markdown_engine")> | null = null
function loadMarkdownEngine() {
  if (!enginePromise) {
    enginePromise = import("./markdown_engine")
  }
  return enginePromise
}

function fallbackCopyText(text: string) {
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand("copy")
  } finally {
    document.body.removeChild(textarea)
  }
}

export function Markdown(props: {
  children?: string | ArrayBuffer
  class?: string
  ext?: string
  readme?: boolean
  toc?: boolean
  trackContent?: boolean
  contentName?: string
  contentPiece?: string
  contentTarget?: string
  sanitize?: boolean
}) {
  const t = useT()
  const { colorMode } = useColorMode()
  const isDark = () => colorMode() === "dark"
  const [encoding, setEncoding] = createSignal<string>("utf-8")
  const [markdownHTML, setMarkdownHTML] = createSignal<string>("")
  const [tocItems, setTocItems] = createSignal<TocHeading[]>([])
  const mermaidTheme = useColorModeValue("default", "dark")
  const { isString, text } = useParseText(props.children)
  const { pathname } = useRouter()
  const timers = new Set<number>()
  let markdownRef: HTMLDivElement | undefined

  onCleanup(() => {
    timers.forEach((timer) => window.clearTimeout(timer))
    timers.clear()
  })

  useScrollListener(
    () =>
      setVisible(
        Boolean(props.toc) && window.scrollY > 100 && tocItems().length > 1,
      ),
    { immediate: true },
  )

  const md = createMemo(() => {
    const raw = text(encoding())
    const content =
      !props.ext || props.ext.toLowerCase() === "md"
        ? raw
        : `\`\`\`${props.ext}\n${raw}\n\`\`\``

    return content.replace(/!\[.*?\]\((.*?)\)/g, (match) => {
      const name = match.match(/!\[(.*?)\]\(.*?\)/)?.[1] ?? ""
      const rawUrl = match.match(/!\[.*?\]\((.*?)\)/)?.[1] ?? ""
      if (!rawUrl) return match

      if (
        rawUrl.startsWith("data:image/") ||
        rawUrl.startsWith("http://") ||
        rawUrl.startsWith("https://") ||
        rawUrl.startsWith("//")
      ) {
        return match
      }

      const resolvedPath = rawUrl.startsWith("/")
        ? rawUrl
        : pathResolve(props.readme ? pathname() : pathDir(pathname()), rawUrl)

      const url = `${api}/d${pathJoin(me().base_path, resolvedPath)}`
      return `![${name}](${url})`
    })
  })

  createEffect(
    on([md, isDark, mermaidTheme], async () => {
      const content = md()
      if (!content) {
        setMarkdownHTML("")
        setTocItems([])
        return
      }
      const labels: EnhanceLabels = {
        alerts: {
          note: t("home.markdown.alert_note"),
          tip: t("home.markdown.alert_tip"),
          important: t("home.markdown.alert_important"),
          warning: t("home.markdown.alert_warning"),
          caution: t("home.markdown.alert_caution"),
        },
        copyCode: t("home.markdown.copy_code"),
      }
      const engine = await loadMarkdownEngine()
      const { html, toc, hasMermaid } = await engine.renderMarkdownCore(
        content,
        Boolean(props.sanitize || getSettingBool("filter_readme_scripts")),
        isDark(),
        labels,
      )
      setMarkdownHTML(html)
      setTocItems(toc)

      queueMicrotask(() => {
        if (!markdownRef) return
        engine.highlightContainerCodeBlocks(markdownRef)
        if (hasMermaid && window.mermaid) {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: mermaidTheme(),
          })
          window.mermaid.run({ querySelector: ".language-mermaid" })
        }
        if (typeof window !== "undefined" && window.location.hash.length > 1) {
          const hashId = decodeURIComponent(window.location.hash.slice(1))
          const escaped =
            typeof CSS !== "undefined" && CSS.escape
              ? CSS.escape(hashId)
              : hashId
          const anchorEl = markdownRef.querySelector(`#${escaped}`)
          anchorEl?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        window.onMDRender?.()
      })
    }),
  )

  const handleContainerClick = async (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    const copyBtn = target?.closest<HTMLButtonElement>("[data-copy-btn='true']")
    if (!copyBtn) return

    const codeBlock = copyBtn.closest(".ol-md-code-block")
    const codeText = codeBlock?.querySelector("pre code")?.textContent ?? ""
    if (!codeText) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeText)
      } else {
        fallbackCopyText(codeText)
      }
    } catch {
      fallbackCopyText(codeText)
    }

    copyBtn.dataset.copied = "true"
    const labelSpan = copyBtn.querySelector("span")
    if (labelSpan) labelSpan.textContent = t("home.markdown.copied")

    const timer = window.setTimeout(() => {
      copyBtn.dataset.copied = "false"
      if (labelSpan) labelSpan.textContent = t("home.markdown.copy_code")
      timers.delete(timer)
    }, 1800)
    timers.add(timer)
  }

  const jumpToHeading = (id: string) => {
    if (!markdownRef) return
    const escaped =
      typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id
    const target = markdownRef.querySelector(`#${escaped}`)
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <Box
      ref={(r: HTMLDivElement) => (markdownRef = r)}
      class="markdown ol-modern-scope"
      pos="relative"
      w="$full"
      data-track-content={props.trackContent ? "" : undefined}
      data-content-name={props.contentName}
      data-content-piece={props.contentPiece}
      data-content-target={props.contentTarget}
    >
      <Show when={props.toc && tocItems().length > 1 && !isTocDisabled()}>
        <nav class="ol-modern-md-toc-bar" aria-label={t("home.markdown.toc")}>
          <span class="ol-modern-md-toc-label">{t("home.markdown.toc")}</span>
          <For each={tocItems()}>
            {(item) => (
              <button
                type="button"
                class="ol-modern-md-toc-pill"
                onClick={() => jumpToHeading(item.id)}
                title={item.text}
              >
                {item.text}
              </button>
            )}
          </For>
        </nav>
      </Show>
      <div
        class={clsx("ol-modern-md markdown-body", props.class)}
        onClick={handleContainerClick}
        innerHTML={markdownHTML()}
      />
      <Show when={!isString}>
        <EncodingSelect
          encoding={encoding()}
          setEncoding={setEncoding}
          referenceText={props.children}
        />
      </Show>
    </Box>
  )
}
