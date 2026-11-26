import { Box, useColorModeValue } from "@hope-ui/solid"
import { createStorageSignal } from "@solid-primitives/storage"
import { clsx } from "clsx"
import hljs from "highlight.js"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
} from "solid-js"
import { unified } from "unified"
import { useCDN, useParseText, useRouter, useT } from "~/hooks"
import { useScrollListener } from "~/pages/home/toolbar/BackTop"
import { getSettingBool, me } from "~/store"
import {
  api,
  loadCSS,
  loadScriptIIFE,
  notify,
  pathDir,
  pathJoin,
  pathResolve,
} from "~/utils"
import { EncodingSelect } from "."
import "./markdown.css"

export interface TocHeading {
  level: number
  text: string
  id: string
}

const MERMAID_PATTERN = /```mermaid[\s\S]*?```/i
const MATH_PATTERN = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/

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
  "overflow",
  "overflow-x",
  "overflow-y",
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

export function sanitizeCssStyle(rawStyle: string): string {
  if (!rawStyle || typeof rawStyle !== "string") return ""
  const cleaned = rawStyle.replace(/\/\*[\s\S]*?\*\//g, "")
  const declarations = cleaned.split(";")
  const safeParts: string[] = []

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(":")
    if (colonIdx <= 0) continue
    const prop = decl.slice(0, colonIdx).trim().toLowerCase()
    const val = decl.slice(colonIdx + 1).trim()
    if (!prop || !val) continue
    if (!isAllowedCssProp(prop)) continue
    if (DANGEROUS_CSS_RE.test(val)) continue
    if (/[{}]/.test(val)) continue

    if (prop === "background-image") {
      if (!SAFE_GRADIENT_RE.test(val)) continue
    }

    safeParts.push(`${prop}: ${val}`)
  }

  return safeParts.join("; ")
}

const MODERN_SANITIZE_SCHEMA = {
  ...defaultSchema,
  clobberPrefix: "",
  tagNames: [
    ...(defaultSchema.tagNames || []).filter(
      (tag) =>
        tag !== "script" &&
        tag !== "iframe" &&
        tag !== "object" &&
        tag !== "embed" &&
        tag !== "style",
    ),
    "mark",
    "figure",
    "figcaption",
    "details",
    "summary",
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...((defaultSchema.attributes?.["*"] as any[]) || []),
      "id",
      "className",
      "style",
      "align",
      "clear",
      "width",
      "height",
      "open",
      "dataTrackContent",
      "dataContentName",
      "dataContentPiece",
      "dataContentTarget",
      "dataNosnippet",
      "dataUmamiEvent",
      "referrerPolicy",
    ],
    code: [
      ...((defaultSchema.attributes?.code as any[]) || []),
      ["className", /^language-[\w-]+$/, "math-inline", "math-display"],
    ],
    a: [
      ...((defaultSchema.attributes?.a as any[]) || []),
      "target",
      "rel",
      "referrerPolicy",
    ],
    img: [
      ...((defaultSchema.attributes?.img as any[]) || []),
      "loading",
      "decoding",
      "align",
      "clear",
      "width",
      "height",
      "referrerPolicy",
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
}

type HastNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, any>
  children?: HastNode[]
}

function getNodeText(node: HastNode): string {
  if (node.type === "text") return node.value || ""
  if (!node.children) return ""
  return node.children.map(getNodeText).join("")
}

type AlertKind = "note" | "tip" | "important" | "warning" | "caution"

const ALERT_PATHS: Record<AlertKind, string[]> = {
  note: ["M12 16v-4", "M12 8h.01", "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"],
  tip: [
    "M9 18h6",
    "M10 22h4",
    "M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14",
  ],
  important: [
    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    "M12 7v3",
    "M12 13h.01",
  ],
  warning: [
    "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",
    "M12 9v4",
    "M12 17h.01",
  ],
  caution: [
    "M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2Z",
    "M12 8v4",
    "M12 16h.01",
  ],
}

function makeAlertIconHast(kind: AlertKind): HastNode {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      viewBox: "0 0 24 24",
      width: "16",
      height: "16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.75",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ariaHidden: "true",
    },
    children: ALERT_PATHS[kind].map((d) => ({
      type: "element",
      tagName: "path",
      properties: { d },
      children: [],
    })),
  }
}

function transformAlertBlockquote(
  node: HastNode,
  labels: Record<AlertKind, string>,
): boolean {
  if (node.tagName !== "blockquote" || !node.children?.length) return false
  const firstElIdx = node.children.findIndex(
    (c) => c.type === "element" && c.tagName === "p",
  )
  if (firstElIdx === -1) return false

  const firstP = node.children[firstElIdx]
  if (!firstP.children?.length) return false

  const firstChild = firstP.children[0]
  if (firstChild.type !== "text" || !firstChild.value) return false

  const match = firstChild.value.match(
    /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\r?\n|\s+)?/i,
  )
  if (!match) return false

  const kind = match[1].toLowerCase() as AlertKind
  const remainingText = firstChild.value.slice(match[0].length)
  if (remainingText) {
    firstChild.value = remainingText
  } else {
    firstP.children.shift()
    if (
      firstP.children[0]?.type === "element" &&
      firstP.children[0].tagName === "br"
    ) {
      firstP.children.shift()
    }
  }

  const bodyChildren = node.children.filter((c, idx) => {
    if (idx !== firstElIdx) return true
    return (c.children?.length || 0) > 0
  })

  node.tagName = "div"
  node.properties = {
    className: ["ol-md-alert", `ol-md-alert--${kind}`],
  }
  node.children = [
    {
      type: "element",
      tagName: "div",
      properties: { className: ["ol-md-alert-title"] },
      children: [
        makeAlertIconHast(kind),
        {
          type: "element",
          tagName: "span",
          properties: {},
          children: [{ type: "text", value: labels[kind] }],
        },
      ],
    },
    {
      type: "element",
      tagName: "div",
      properties: { className: ["ol-md-alert-body"] },
      children: bodyChildren,
    },
  ]

  return true
}

function slugifyHeading(text: string, seen: Map<string, number>): string {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section"

  const count = seen.get(base) ?? 0
  seen.set(base, count + 1)
  return count === 0 ? base : `${base}-${count}`
}

function createCopyIconHast(): HastNode {
  return {
    type: "element",
    tagName: "svg",
    properties: {
      viewBox: "0 0 24 24",
      width: "13",
      height: "13",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.75",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ariaHidden: "true",
    },
    children: [
      {
        type: "element",
        tagName: "rect",
        properties: {
          x: "9",
          y: "9",
          width: "13",
          height: "13",
          rx: "2",
          ry: "2",
        },
        children: [],
      },
      {
        type: "element",
        tagName: "path",
        properties: {
          d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
        },
        children: [],
      },
    ],
  }
}

interface EnhanceLabels {
  alerts: Record<AlertKind, string>
  copyCode: string
}

function rehypeModernEnhance(options: {
  sanitizeStyles: boolean
  tocOut: TocHeading[]
  labels: EnhanceLabels
}) {
  return (tree: HastNode) => {
    const slugCounts = new Map<string, number>()

    const walk = (parent: HastNode) => {
      if (!parent.children) return

      for (let i = 0; i < parent.children.length; i++) {
        const node = parent.children[i]
        if (node.type !== "element") continue

        if (options.sanitizeStyles && node.properties?.style) {
          const safe = sanitizeCssStyle(String(node.properties.style))
          if (safe) {
            node.properties.style = safe
          } else {
            delete node.properties.style
          }
        }

        if (typeof node.properties?.href === "string") {
          const href = node.properties.href.trim().toLowerCase()
          if (
            href.startsWith("javascript:") ||
            href.startsWith("vbscript:") ||
            href.startsWith("data:text/html")
          ) {
            node.properties.href = "#"
          }
        }
        if (node.tagName === "a" && node.properties?.target === "_blank") {
          const rel = String(node.properties.rel || "")
          if (!rel.includes("noopener")) {
            node.properties.rel = `${rel} noopener noreferrer`.trim()
          }
        }
        if (typeof node.properties?.src === "string") {
          const src = node.properties.src.trim().toLowerCase()
          if (
            src.startsWith("javascript:") ||
            src.startsWith("vbscript:") ||
            src.startsWith("data:text/html")
          ) {
            delete node.properties.src
          }
        }

        if (node.tagName && /^h[1-4]$/.test(node.tagName)) {
          const level = Number(node.tagName.slice(1))
          const text = getNodeText(node).trim()
          if (text) {
            node.properties = node.properties || {}
            const existingId =
              typeof node.properties.id === "string" &&
              node.properties.id.trim()
                ? node.properties.id.trim()
                : slugifyHeading(text, slugCounts)
            node.properties.id = existingId
            if (level <= 3) {
              options.tocOut.push({ level, text, id: existingId })
            }
          }
        }

        if (node.tagName === "blockquote") {
          transformAlertBlockquote(node, options.labels.alerts)
        }

        if (node.tagName === "table") {
          const tableClone: HastNode = { ...node }
          parent.children[i] = {
            type: "element",
            tagName: "div",
            properties: { className: ["ol-md-table-wrap"] },
            children: [
              {
                type: "element",
                tagName: "div",
                properties: { className: ["ol-md-table-scroll"] },
                children: [tableClone],
              },
            ],
          }
          walk(tableClone)
          continue
        }

        if (
          node.tagName === "pre" &&
          node.children?.some(
            (c) => c.type === "element" && c.tagName === "code",
          )
        ) {
          const codeEl = node.children.find(
            (c) => c.type === "element" && c.tagName === "code",
          )!
          const classes = Array.isArray(codeEl.properties?.className)
            ? (codeEl.properties!.className as string[])
            : []
          const langClass = classes.find((c) => c.startsWith("language-"))
          const lang = langClass ? langClass.replace("language-", "") : "text"

          if (lang !== "mermaid") {
            const preClone: HastNode = { ...node }
            parent.children[i] = {
              type: "element",
              tagName: "div",
              properties: { className: ["ol-md-code-block"] },
              children: [
                {
                  type: "element",
                  tagName: "div",
                  properties: { className: ["ol-md-code-header"] },
                  children: [
                    {
                      type: "element",
                      tagName: "span",
                      properties: { className: ["ol-md-code-lang"] },
                      children: [{ type: "text", value: lang }],
                    },
                    {
                      type: "element",
                      tagName: "button",
                      properties: {
                        type: "button",
                        className: ["ol-md-copy-btn"],
                        "data-copy-btn": "true",
                      },
                      children: [
                        createCopyIconHast(),
                        {
                          type: "element",
                          tagName: "span",
                          properties: {},
                          children: [
                            { type: "text", value: options.labels.copyCode },
                          ],
                        },
                      ],
                    },
                  ],
                },
                preClone,
              ],
            }
            continue
          }
        }

        walk(node)
      }
    }

    walk(tree)
  }
}

interface CachedMdResult {
  html: string
  toc: TocHeading[]
  hasMermaid: boolean
}

const mdRenderCache = new Map<string, CachedMdResult>()
const MAX_MD_CACHE = 16

function putMdCache(key: string, val: CachedMdResult) {
  if (mdRenderCache.has(key)) {
    mdRenderCache.delete(key)
  } else if (mdRenderCache.size >= MAX_MD_CACHE) {
    const oldest = mdRenderCache.keys().next().value
    if (oldest !== undefined) mdRenderCache.delete(oldest)
  }
  mdRenderCache.set(key, val)
}

const { katexCSSPath, mermaidJSPath } = useCDN()

async function renderMarkdown(
  content: string,
  sanitize: boolean,
  labels: EnhanceLabels,
): Promise<CachedMdResult> {
  const cacheKey = `${sanitize ? "1" : "0"}:${labels.copyCode}:${content}`
  const hit = mdRenderCache.get(cacheKey)
  if (hit && !hit.hasMermaid) {
    return hit
  }

  const toc: TocHeading[] = []
  const processor = unified().use(remarkParse).use(remarkGfm)

  const hasMermaid = MERMAID_PATTERN.test(content)
  const hasMath = MATH_PATTERN.test(content)
  if (hasMath) {
    const { default: remarkMath } = await import("remark-math")
    processor.use(remarkMath)
    await loadCSS(katexCSSPath(), "katex").catch(() =>
      notify.error(
        "Failed to load KaTeX CSS, math formulas will not be rendered",
      ),
    )
  }
  if (hasMermaid) {
    await loadScriptIIFE(mermaidJSPath(), "mermaid").catch(() =>
      notify.error("Failed to load Mermaid JS, diagrams will not be rendered"),
    )
  }

  processor.use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw)

  if (sanitize) {
    processor.use(rehypeSanitize, MODERN_SANITIZE_SCHEMA as any)
  }

  processor.use(rehypeModernEnhance as any, {
    sanitizeStyles: sanitize,
    tocOut: toc,
    labels,
  })

  if (hasMath) {
    const { default: rehypeKatex } = await import("rehype-katex")
    processor.use(rehypeKatex)
  }

  processor.use(rehypeStringify)

  const result = await processor.process(content)
  const out: CachedMdResult = {
    html: String(result),
    toc,
    hasMermaid,
  }
  putMdCache(cacheKey, out)
  return out
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
    on([md, mermaidTheme], async () => {
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
      const { html, toc, hasMermaid } = await renderMarkdown(
        md(),
        Boolean(props.sanitize || getSettingBool("filter_readme_scripts")),
        labels,
      )
      setMarkdownHTML(html)
      setTocItems(toc)

      queueMicrotask(() => {
        if (!markdownRef) return
        const noHighlight = new Set([
          "language-plain",
          "language-plaintext",
          "language-text",
        ])
        markdownRef
          .querySelectorAll('pre code[class*="language-"]')
          .forEach((el) => {
            const codeEl = el as HTMLElement
            if (codeEl.dataset.highlighted === "yes") return
            const langClass = Array.from(codeEl.classList).find((c) =>
              c.startsWith("language-"),
            )
            if (
              langClass &&
              !noHighlight.has(langClass) &&
              hljs.getLanguage(langClass.replace("language-", ""))
            ) {
              hljs.highlightElement(codeEl)
            }
          })
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
