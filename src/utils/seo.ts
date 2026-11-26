const JMCOMIC_EPHEMERAL_SEGMENTS = new Set([
  "今日推荐",
  "最近更新",
  "推荐",
  "排行榜",
  "分类",
  "标签",
])

function upsertMetaTag(name: string, content: string | null) {
  if (typeof document === "undefined" || !document.head) return
  const existing = document.head.querySelector(`meta[name="${name}"]`)
  if (!content || !content.trim()) {
    existing?.remove()
    return
  }
  if (existing) {
    existing.setAttribute("content", content)
    return
  }
  const meta = document.createElement("meta")
  meta.setAttribute("name", name)
  meta.setAttribute("content", content)
  document.head.appendChild(meta)
}

export function setRobotsMeta(content: string | null) {
  upsertMetaTag("robots", content)
}

export function setDescriptionMeta(content: string | null) {
  upsertMetaTag("description", content)
}

export function setCanonicalLink(pathname: string | null) {
  if (typeof document === "undefined" || !document.head) return
  const existing = document.head.querySelector('link[rel="canonical"]')
  if (!pathname || !pathname.trim()) {
    existing?.remove()
    return
  }
  let href = pathname
  if (typeof window !== "undefined" && !/^https?:\/\//i.test(pathname)) {
    try {
      const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`
      href = new URL(normalized, window.location.origin).href
    } catch {
      href = pathname
    }
  }
  if (existing) {
    existing.setAttribute("href", href)
    return
  }
  const link = document.createElement("link")
  link.setAttribute("rel", "canonical")
  link.setAttribute("href", href)
  document.head.appendChild(link)
}

export function isJMComicEphemeralPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean)
  return segments.some((segment) => JMCOMIC_EPHEMERAL_SEGMENTS.has(segment))
}
