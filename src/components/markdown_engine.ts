import hljs from "highlight.js/lib/core"
import bash from "highlight.js/lib/languages/bash"
import c from "highlight.js/lib/languages/c"
import cpp from "highlight.js/lib/languages/cpp"
import css from "highlight.js/lib/languages/css"
import diff from "highlight.js/lib/languages/diff"
import go from "highlight.js/lib/languages/go"
import ini from "highlight.js/lib/languages/ini"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import markdown from "highlight.js/lib/languages/markdown"
import python from "highlight.js/lib/languages/python"
import shell from "highlight.js/lib/languages/shell"
import sql from "highlight.js/lib/languages/sql"
import typescript from "highlight.js/lib/languages/typescript"
import xml from "highlight.js/lib/languages/xml"
import yaml from "highlight.js/lib/languages/yaml"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { useCDN } from "~/hooks"
import { loadCSS, loadScriptIIFE, notify } from "~/utils"
import {
  type AlertKind,
  type CachedMdResult,
  type EnhanceLabels,
  type TocHeading,
  rescueDarkContrastColor,
  sanitizeCssStyle,
} from "./Markdown"

hljs.registerLanguage("bash", bash)
hljs.registerLanguage("shell", shell)
hljs.registerLanguage("json", json)
hljs.registerLanguage("yaml", yaml)
hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("typescript", typescript)
hljs.registerLanguage("go", go)
hljs.registerLanguage("python", python)
hljs.registerLanguage("sql", sql)
hljs.registerLanguage("xml", xml)
hljs.registerLanguage("css", css)
hljs.registerLanguage("ini", ini)
hljs.registerLanguage("markdown", markdown)
hljs.registerLanguage("diff", diff)
hljs.registerLanguage("c", c)
hljs.registerLanguage("cpp", cpp)

const MERMAID_PATTERN = /```mermaid[\s\S]*?```/i
const MATH_PATTERN = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/

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
    "br",
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
      "data*",
      "dataTrackContent",
      "dataContentName",
      "dataContentPiece",
      "dataContentTarget",
      "dataNosnippet",
      "dataUmamiEvent",
      "referrerPolicy",
      "referrerpolicy",
    ],
    br: ["clear"],
    code: [
      ...((defaultSchema.attributes?.code as any[]) || []),
      ["className", /^language-[\w-]+$/, "math-inline", "math-display"],
    ],
    a: [
      ...((defaultSchema.attributes?.a as any[]) || []),
      "target",
      "rel",
      "referrerPolicy",
      "referrerpolicy",
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
      "referrerpolicy",
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

const SPONSOR_HEADING_RE = /赞助|sponsor|打赏|捐助|支持本站/i

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

function rehypeModernEnhance(options: {
  sanitizeStyles: boolean
  darkMode: boolean
  tocOut: TocHeading[]
  labels: EnhanceLabels
}) {
  return (tree: HastNode) => {
    const slugCounts = new Map<string, number>()
    let hasSponsorAnchor = false

    const checkExistingIds = (parent: HastNode) => {
      if (!parent.children) return
      for (const child of parent.children) {
        if (child.type === "element") {
          if (child.properties?.id === "sponsor") {
            hasSponsorAnchor = true
            slugCounts.set("sponsor", 1)
          }
          checkExistingIds(child)
        }
      }
    }
    checkExistingIds(tree)

    const walk = (parent: HastNode) => {
      if (!parent.children) return

      for (let i = 0; i < parent.children.length; i++) {
        const node = parent.children[i]
        if (node.type !== "element") continue

        if (node.properties?.style) {
          if (options.sanitizeStyles) {
            const safe = sanitizeCssStyle(
              String(node.properties.style),
              options.darkMode,
            )
            if (safe) {
              node.properties.style = safe
            } else {
              delete node.properties.style
            }
          } else if (options.darkMode) {
            node.properties.style = String(node.properties.style).replace(
              /(^|;)\s*color\s*:\s*([^;]+)/gi,
              (_m, pre: string, rawVal: string) =>
                `${pre} color: ${rescueDarkContrastColor(rawVal.trim(), true)}`,
            )
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
            let resolvedId =
              typeof node.properties.id === "string" &&
              node.properties.id.trim()
                ? node.properties.id.trim()
                : ""
            if (!resolvedId) {
              if (!hasSponsorAnchor && SPONSOR_HEADING_RE.test(text)) {
                resolvedId = "sponsor"
                hasSponsorAnchor = true
                slugCounts.set("sponsor", 1)
              } else {
                resolvedId = slugifyHeading(text, slugCounts)
              }
            } else if (
              !hasSponsorAnchor &&
              resolvedId !== "sponsor" &&
              SPONSOR_HEADING_RE.test(text)
            ) {
              hasSponsorAnchor = true
              node.children = [
                {
                  type: "element",
                  tagName: "span",
                  properties: { id: "sponsor" },
                  children: [],
                },
                ...(node.children || []),
              ]
            }
            node.properties.id = resolvedId
            if (level <= 3) {
              options.tocOut.push({ level, text, id: resolvedId })
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

const mdRenderCache = new Map<string, CachedMdResult>()
const MAX_MD_CACHE = 20

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

export async function renderMarkdownCore(
  content: string,
  sanitize: boolean,
  darkMode: boolean,
  labels: EnhanceLabels,
): Promise<CachedMdResult> {
  const cacheKey = `${sanitize ? "1" : "0"}:${darkMode ? "d" : "l"}:${labels.copyCode}:${content}`
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
    darkMode,
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

const NO_HIGHLIGHT = new Set([
  "language-plain",
  "language-plaintext",
  "language-text",
])

export function highlightContainerCodeBlocks(container: HTMLElement) {
  container.querySelectorAll('pre code[class*="language-"]').forEach((el) => {
    const codeEl = el as HTMLElement
    if (codeEl.dataset.highlighted === "yes") return
    const langClass = Array.from(codeEl.classList).find((c) =>
      c.startsWith("language-"),
    )
    if (!langClass || NO_HIGHLIGHT.has(langClass)) return
    const langName = langClass.replace("language-", "")
    if (hljs.getLanguage(langName)) {
      hljs.highlightElement(codeEl)
    }
  })
}
