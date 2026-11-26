import { createSignal } from "solid-js"
import { getSetting } from "~/store/settings"
import { Notice, PublicNoticesData, Resp } from "~/types"
import { r } from "~/utils"

const LS_MODAL_ACK_KEY = "ol_notice_modal_ack_v1"
const LS_BANNER_DISMISS_KEY = "ol_notice_banner_dismiss_v1"
const SS_MODAL_ACK_KEY = "ol_notice_modal_session_v1"
const SS_BANNER_DISMISS_KEY = "ol_notice_banner_session_v1"

interface DismissEntry {
  key: string
  until?: number
}

function readMap(
  storage: Storage | undefined,
  key: string,
): Record<string, DismissEntry> {
  if (!storage) return {}
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, DismissEntry>) : {}
  } catch {
    return {}
  }
}

function writeMap(
  storage: Storage | undefined,
  key: string,
  data: Record<string, DismissEntry>,
) {
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(data))
  } catch {
    /* storage quota / private mode */
  }
}

export function hashStringHex(input: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 ^= c
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= c
    h2 = Math.imul(h2, 0x85ebca6b)
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).slice(0, 4).padStart(4, "0")
  )
}

export function normalizePathForMatch(p?: string): string {
  if (!p || !p.trim()) return "/"
  let s = p.trim()
  if (!s.startsWith("/")) s = "/" + s
  if (s.length > 1 && s.endsWith("/")) s = s.replace(/\/+$/, "")
  return s || "/"
}

export function matchPathPrefix(
  prefix: string | undefined,
  pathname: string,
): boolean {
  const normPrefix = normalizePathForMatch(prefix)
  if (normPrefix === "/") return true
  const normPath = normalizePathForMatch(pathname)
  return normPath === normPrefix || normPath.startsWith(`${normPrefix}/`)
}

function stripMarkdownSummary(md: string): string {
  return md
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}

export function noticeVersionKey(n: Notice): string {
  const hash =
    n.version_hash || hashStringHex(`${n.title}\n${n.summary}\n${n.content}`)
  return `${n.id}:${hash}`
}

const [activeNotices, setActiveNotices] = createSignal<Notice[]>([])
const [historyNotices, setHistoryNotices] = createSignal<Notice[]>([])
const [noticesLoaded, setNoticesLoaded] = createSignal(false)
const [dismissTick, setDismissTick] = createSignal(0)
const [manualModalNotice, setManualModalNotice] = createSignal<Notice | null>(
  null,
)
const [autoModalNotice, setAutoModalNotice] = createSignal<Notice | null>(null)
const [visitModalClaimed, setVisitModalClaimed] = createSignal(false)

export {
  activeNotices,
  historyNotices,
  noticesLoaded,
  manualModalNotice,
  autoModalNotice,
  visitModalClaimed,
  setVisitModalClaimed,
}

function isDismissedInScope(n: Notice, lsKey: string, ssKey: string): boolean {
  dismissTick()
  if (typeof window === "undefined") return false
  const idStr = String(n.id)
  const verKey = noticeVersionKey(n)
  const strategy = n.dismiss_strategy || "until_updated"

  if (strategy === "session") {
    const map = readMap(window.sessionStorage, ssKey)
    return map[idStr]?.key === verKey
  }

  const map = readMap(window.localStorage, lsKey)
  const entry = map[idStr]
  if (!entry) return false

  if (strategy === "24h") {
    if (entry.key !== verKey) return false
    return typeof entry.until === "number" && Date.now() < entry.until
  }

  return entry.key === verKey
}

function recordDismissInScope(n: Notice, lsKey: string, ssKey: string) {
  if (typeof window === "undefined") return
  const idStr = String(n.id)
  const verKey = noticeVersionKey(n)
  const strategy = n.dismiss_strategy || "until_updated"

  if (strategy === "session") {
    const map = readMap(window.sessionStorage, ssKey)
    map[idStr] = { key: verKey }
    writeMap(window.sessionStorage, ssKey, map)
  } else {
    const map = readMap(window.localStorage, lsKey)
    map[idStr] = {
      key: verKey,
      until: strategy === "24h" ? Date.now() + 24 * 3600 * 1000 : undefined,
    }
    writeMap(window.localStorage, lsKey, map)
  }
  setDismissTick((v) => v + 1)
}

export function isNoticeModalAcked(n: Notice): boolean {
  return isDismissedInScope(n, LS_MODAL_ACK_KEY, SS_MODAL_ACK_KEY)
}

export function isNoticeBannerDismissed(n: Notice): boolean {
  return isDismissedInScope(n, LS_BANNER_DISMISS_KEY, SS_BANNER_DISMISS_KEY)
}

export function ackNoticeModal(n: Notice) {
  recordDismissInScope(n, LS_MODAL_ACK_KEY, SS_MODAL_ACK_KEY)
  if (autoModalNotice()?.id === n.id) {
    setAutoModalNotice(null)
  }
}

export function dismissNoticeBanner(n: Notice) {
  recordDismissInScope(n, LS_BANNER_DISMISS_KEY, SS_BANNER_DISMISS_KEY)
  recordDismissInScope(n, LS_MODAL_ACK_KEY, SS_MODAL_ACK_KEY)
}

export function shouldNoticeShowBanner(n: Notice): boolean {
  const dt = n.display_type || "auto"
  return dt === "top_banner" || dt === "both" || dt === "auto"
}

export function shouldNoticeAutoModal(n: Notice): boolean {
  const dt = n.display_type || "auto"
  if (dt === "modal" || dt === "both") return true
  if (dt === "auto" && n.severity === "critical") return true
  return false
}

export function getActiveBannerNoticeForPath(pathname: string): Notice | null {
  const list = activeNotices()
  for (const n of list) {
    if (!n.enabled) continue
    if (!matchPathPrefix(n.path_prefix, pathname)) continue
    if (!shouldNoticeShowBanner(n)) continue
    if (isNoticeBannerDismissed(n)) continue
    return n
  }
  return null
}

export function getUnreadModalNoticeForPath(pathname: string): Notice | null {
  const list = activeNotices()
  for (const n of list) {
    if (!n.enabled) continue
    if (!matchPathPrefix(n.path_prefix, pathname)) continue
    if (!shouldNoticeAutoModal(n)) continue
    if (isNoticeModalAcked(n)) continue
    return n
  }
  return null
}

export function openNoticeModalManual(n: Notice) {
  setManualModalNotice(n)
}

export function closeNoticeModal() {
  const auto = autoModalNotice()
  if (auto) {
    ackNoticeModal(auto)
  }
  setManualModalNotice(null)
  setAutoModalNotice(null)
}

export function applyFallbackAnnouncementIfNeeded(hasPromotions: boolean) {
  if (
    activeNotices().length > 0 ||
    historyNotices().length > 0 ||
    hasPromotions
  ) {
    return
  }
  const legacy = (getSetting("announcement") || "").trim()
  if (!legacy) return
  const fallback: Notice = {
    id: 0,
    title: "",
    summary: stripMarkdownSummary(legacy),
    content: legacy,
    version_hash: hashStringHex(legacy),
    severity: "info",
    display_type: "modal",
    dismiss_strategy: "until_updated",
    path_prefix: "/",
    sort: 0,
    enabled: true,
  }
  setActiveNotices([fallback])
}

export function hydrateNoticesFromBootstrap(
  payload?: PublicNoticesData | Notice[],
): boolean {
  if (!payload) return false
  if (Array.isArray(payload)) {
    setActiveNotices(payload)
    setHistoryNotices([])
  } else if (typeof payload === "object") {
    setActiveNotices(Array.isArray(payload.active) ? payload.active : [])
    setHistoryNotices(Array.isArray(payload.history) ? payload.history : [])
  } else {
    return false
  }
  setNoticesLoaded(true)
  return true
}

export async function loadPublicNotices(): Promise<boolean> {
  try {
    const resp = (await r.get("/public/notices")) as Resp<
      PublicNoticesData | Notice[]
    >
    if (resp && resp.code === 200 && resp.data) {
      return hydrateNoticesFromBootstrap(resp.data)
    }
  } catch {
    /* 404 or network fallback */
  }
  setActiveNotices([])
  setHistoryNotices([])
  setNoticesLoaded(true)
  return false
}

export { setAutoModalNotice }
