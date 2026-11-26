import { createSignal } from "solid-js"
import {
  applyFallbackAnnouncementIfNeeded,
  getUnreadModalNoticeForPath,
  hydrateNoticesFromBootstrap,
  loadPublicNotices,
  matchPathPrefix,
  noticesLoaded,
  setAutoModalNotice,
  setVisitModalClaimed,
  visitModalClaimed,
} from "~/store/notices"
import { Promotion, PromotionSlot, Resp } from "~/types"
import { r } from "~/utils"
import { getBootstrapData } from "~/utils/config"

export const MAX_PROMO_CLOSE_DELAY_SEC = 10

const LS_PROMO_CAP_KEY = "ol_promo_cap_v1"
const SS_PROMO_CAP_KEY = "ol_promo_session_v1"
const LS_PROMO_SNOOZE_KEY = "ol_promo_snooze_v1"

const shownThisVisit = new Set<number>()

function readNumberMap(
  storage: Storage | undefined,
  key: string,
): Record<string, number> {
  if (!storage) return {}
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function writeNumberMap(
  storage: Storage | undefined,
  key: string,
  data: Record<string, number>,
) {
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(data))
  } catch {
    /* private mode / quota */
  }
}

export function clampCloseDelay(sec?: number): number {
  const n = Number(sec ?? 0)
  if (!Number.isFinite(n)) return 0
  return Math.min(Math.max(Math.round(n), 0), MAX_PROMO_CLOSE_DELAY_SEC)
}

function normalizePromotion(p: Promotion): Promotion {
  return {
    ...p,
    close_delay_sec: clampCloseDelay(p.close_delay_sec),
    freq_cap: p.freq_cap || "session",
    path_prefix: p.path_prefix || "/",
  }
}

const [promotions, setPromotions] = createSignal<Promotion[]>([])
const [promotionsLoaded, setPromotionsLoaded] = createSignal(false)
const [promoTick, setPromoTick] = createSignal(0)
const [activePopupAds, setActivePopupAds] = createSignal<Promotion[]>([])
const [popupAdOpen, setPopupAdOpen] = createSignal(false)

export { promotions, promotionsLoaded, activePopupAds, popupAdOpen }

export function isPromoSnoozedToday(p: Promotion): boolean {
  promoTick()
  if (typeof window === "undefined") return false
  const map = readNumberMap(window.localStorage, LS_PROMO_SNOOZE_KEY)
  const now = Date.now()
  const globalUntil = map["__popup_all__"] ?? 0
  const itemUntil = map[String(p.id)] ?? 0
  return now < globalUntil || now < itemUntil
}

export function snoozePromosUntilLocalMidnight(ads: Promotion[]) {
  if (typeof window === "undefined") return
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const until = end.getTime()
  const map = readNumberMap(window.localStorage, LS_PROMO_SNOOZE_KEY)
  map["__popup_all__"] = until
  ads.forEach((ad) => {
    map[String(ad.id)] = until
  })
  writeNumberMap(window.localStorage, LS_PROMO_SNOOZE_KEY, map)
  setPromoTick((v) => v + 1)
}

export function isPromoCapped(p: Promotion): boolean {
  promoTick()
  if (typeof window === "undefined") return false
  const idStr = String(p.id)
  const cap = p.freq_cap || "session"

  if (cap === "visit") {
    return shownThisVisit.has(p.id)
  }
  if (cap === "session") {
    const sMap = readNumberMap(window.sessionStorage, SS_PROMO_CAP_KEY)
    return Boolean(sMap[idStr])
  }
  const lMap = readNumberMap(window.localStorage, LS_PROMO_CAP_KEY)
  const until = lMap[idStr]
  if (!until) return false
  return Date.now() < until
}

export function markPromoShown(p: Promotion) {
  shownThisVisit.add(p.id)
  if (typeof window === "undefined") return
  const idStr = String(p.id)
  const cap = p.freq_cap || "session"

  if (cap === "session") {
    const sMap = readNumberMap(window.sessionStorage, SS_PROMO_CAP_KEY)
    sMap[idStr] = Date.now()
    writeNumberMap(window.sessionStorage, SS_PROMO_CAP_KEY, sMap)
  } else if (cap === "12h" || cap === "24h") {
    const hours = cap === "12h" ? 12 : 24
    const lMap = readNumberMap(window.localStorage, LS_PROMO_CAP_KEY)
    lMap[idStr] = Date.now() + hours * 3600 * 1000
    writeNumberMap(window.localStorage, LS_PROMO_CAP_KEY, lMap)
  }
  setPromoTick((v) => v + 1)
}

export function getPromotionsForSlot(
  slot: PromotionSlot,
  pathname: string,
): Promotion[] {
  return promotions().filter(
    (p) =>
      p.enabled && p.slot === slot && matchPathPrefix(p.path_prefix, pathname),
  )
}

export function closePopupAdModal() {
  setPopupAdOpen(false)
}

export function hydratePromotionsFromBootstrap(
  payload?: Promotion[] | { content: Promotion[] },
): boolean {
  if (!payload) return false
  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.content)
      ? payload.content
      : null
  if (!rawList) return false
  setPromotions(rawList.map(normalizePromotion))
  setPromotionsLoaded(true)
  return true
}

export async function loadPublicPromotions(): Promise<boolean> {
  try {
    const resp = (await r.get("/public/promotions")) as Resp<
      Promotion[] | { content: Promotion[] }
    >
    if (resp && resp.code === 200 && resp.data) {
      return hydratePromotionsFromBootstrap(resp.data)
    }
  } catch {
    /* 404 or network fallback */
  }
  setPromotions([])
  setPromotionsLoaded(true)
  return false
}

let publicChannelsPromise: Promise<void> | null = null

export function ensurePublicChannelsLoaded(): Promise<void> {
  if (!publicChannelsPromise) {
    const boot = getBootstrapData()
    const bootNoticesOk =
      noticesLoaded() || hydrateNoticesFromBootstrap(boot?.notices)
    const bootPromosOk =
      promotionsLoaded() || hydratePromotionsFromBootstrap(boot?.promotions)

    if (bootNoticesOk && bootPromosOk) {
      applyFallbackAnnouncementIfNeeded(promotions().length > 0)
      publicChannelsPromise = Promise.resolve()
      return publicChannelsPromise
    }

    publicChannelsPromise = (async () => {
      await Promise.all([
        bootNoticesOk ? Promise.resolve(true) : loadPublicNotices(),
        bootPromosOk ? Promise.resolve(true) : loadPublicPromotions(),
      ])
      applyFallbackAnnouncementIfNeeded(promotions().length > 0)
    })()
  }
  return publicChannelsPromise
}

export function orchestrateVisitModals(pathname: string) {
  if (!noticesLoaded() || !promotionsLoaded()) return
  if (visitModalClaimed()) return

  const unreadNotice = getUnreadModalNoticeForPath(pathname)
  if (unreadNotice) {
    setVisitModalClaimed(true)
    setAutoModalNotice(unreadNotice)
    return
  }

  const candidates = getPromotionsForSlot("popup_ad", pathname).filter(
    (ad) => !isPromoSnoozedToday(ad) && !isPromoCapped(ad),
  )
  if (candidates.length > 0) {
    setVisitModalClaimed(true)
    candidates.forEach(markPromoShown)
    setActivePopupAds(candidates)
    setPopupAdOpen(true)
  }
}
