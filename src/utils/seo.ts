const JMCOMIC_EPHEMERAL_SEGMENTS = new Set([
  "今日推荐",
  "最近更新",
  "推荐",
  "排行榜",
  "分类",
  "标签",
])

const JSONLD_SCRIPT_ID = "openlist-jsonld"

function upsertMetaByAttr(
  attr: "name" | "property",
  key: string,
  content: string | null | undefined,
) {
  if (typeof document === "undefined" || !document.head) return
  const existing = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content || !content.trim()) {
    existing?.remove()
    return
  }
  if (existing) {
    existing.setAttribute("content", content)
    return
  }
  const meta = document.createElement("meta")
  meta.setAttribute(attr, key)
  meta.setAttribute("content", content)
  document.head.appendChild(meta)
}

export function setRobotsMeta(content: string | null) {
  upsertMetaByAttr("name", "robots", content)
}

export function setDescriptionMeta(content: string | null) {
  upsertMetaByAttr("name", "description", content)
}

export function resolveAbsoluteUrl(pathname: string): string {
  if (typeof window === "undefined") return pathname
  if (/^https?:\/\//i.test(pathname)) return pathname
  try {
    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`
    return new URL(normalized, window.location.origin).href
  } catch {
    return pathname
  }
}

export function setCanonicalLink(pathname: string | null) {
  if (typeof document === "undefined" || !document.head) return
  const existing = document.head.querySelector('link[rel="canonical"]')
  if (!pathname || !pathname.trim()) {
    existing?.remove()
    return
  }
  const href = resolveAbsoluteUrl(pathname)
  if (existing) {
    existing.setAttribute("href", href)
    return
  }
  const link = document.createElement("link")
  link.setAttribute("rel", "canonical")
  link.setAttribute("href", href)
  document.head.appendChild(link)
}

export interface OpenGraphMetaInput {
  title?: string | null
  description?: string | null
  url?: string | null
  type?: "website" | "article" | null
  siteName?: string | null
  image?: string | null
}

export function setOpenGraphMeta(input: OpenGraphMetaInput | null) {
  if (!input) {
    upsertMetaByAttr("property", "og:title", null)
    upsertMetaByAttr("property", "og:description", null)
    upsertMetaByAttr("property", "og:url", null)
    upsertMetaByAttr("property", "og:type", null)
    upsertMetaByAttr("property", "og:site_name", null)
    upsertMetaByAttr("property", "og:image", null)
    upsertMetaByAttr("name", "twitter:card", null)
    return
  }
  upsertMetaByAttr("property", "og:title", input.title)
  upsertMetaByAttr("property", "og:description", input.description)
  upsertMetaByAttr(
    "property",
    "og:url",
    input.url ? resolveAbsoluteUrl(input.url) : null,
  )
  upsertMetaByAttr("property", "og:type", input.type ?? "website")
  upsertMetaByAttr("property", "og:site_name", input.siteName)
  upsertMetaByAttr("property", "og:image", input.image)
  upsertMetaByAttr(
    "name",
    "twitter:card",
    input.title || input.description
      ? input.image
        ? "summary_large_image"
        : "summary"
      : null,
  )
}

export function setJsonLd(payload: Record<string, unknown> | null) {
  if (typeof document === "undefined" || !document.head) return
  const existing = document.getElementById(JSONLD_SCRIPT_ID)
  if (!payload) {
    existing?.remove()
    return
  }
  const safeJson = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
  if (existing) {
    existing.textContent = safeJson
    return
  }
  const script = document.createElement("script")
  script.id = JSONLD_SCRIPT_ID
  script.type = "application/ld+json"
  script.textContent = safeJson
  document.head.appendChild(script)
}

export function stripPlainTextForSeo(raw: string, maxChars = 160): string {
  if (!raw || !raw.trim()) return ""
  const cleaned = raw
    // Strip data-nosnippet blocks so ad/sponsor snippets never enter SEO
    .replace(/<([a-z0-9]+)\b[^>]*\bdata-nosnippet\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/gim, " ")
    .replace(/[#>*_`~|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const chars = Array.from(cleaned)
  if (chars.length <= maxChars) return cleaned
  return `${chars
    .slice(0, Math.max(1, maxChars - 1))
    .join("")
    .trimEnd()}…`
}

export function buildBreadcrumbJsonLd(
  pathname: string,
  siteTitle: string,
  encodeHref: (path: string) => string,
) {
  const segments = pathname.split("/").filter(Boolean)
  const items: Array<Record<string, unknown>> = [
    {
      "@type": "ListItem",
      position: 1,
      name: siteTitle || "OpenList",
      item: resolveAbsoluteUrl(encodeHref("/")),
    },
  ]
  let acc = ""
  segments.forEach((seg, idx) => {
    acc += `/${seg}`
    items.push({
      "@type": "ListItem",
      position: idx + 2,
      name: seg,
      item: resolveAbsoluteUrl(encodeHref(acc)),
    })
  })
  return {
    "@type": "BreadcrumbList",
    itemListElement: items,
  }
}

export function isJMComicEphemeralPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean)
  return segments.some((segment) => JMCOMIC_EPHEMERAL_SEGMENTS.has(segment))
}
