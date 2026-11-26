import { For, Show, createMemo, createSignal, onMount } from "solid-js"
import { LinkWithBase } from "~/components"
import { useT } from "~/hooks"
import { getSetting, getSettingBool, me } from "~/store"
import { FooterLinkItem, UserMethods } from "~/types"

export const Footer = () => {
  const t = useT()
  const [loadSec, setLoadSec] = createSignal("")

  onMount(() => {
    if (!getSettingBool("footer_show_perf")) return
    const nav = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined
    const rawMs =
      nav && nav.domContentLoadedEventEnd > 0
        ? nav.domContentLoadedEventEnd - nav.fetchStart
        : performance.now()
    const sec = Math.max(0.01, rawMs / 1000).toFixed(2)
    setLoadSec(sec)
  })

  const uptimeDays = createMemo<number | null>(() => {
    if (!getSettingBool("footer_show_uptime")) return null
    const raw = (getSetting("site_launch_at") || "").trim()
    if (!raw) return null
    const launchMs = Date.parse(raw)
    if (Number.isNaN(launchMs)) return null
    return Math.max(0, Math.floor((Date.now() - launchMs) / 86_400_000))
  })

  const customLinks = createMemo<FooterLinkItem[]>(() => {
    const raw = (getSetting("footer_links") || "").trim()
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((it): it is FooterLinkItem =>
        Boolean(
          it &&
          typeof it.label === "string" &&
          it.label.trim() &&
          typeof it.url === "string" &&
          it.url.trim(),
        ),
      )
    } catch {
      return []
    }
  })

  const isGuest = () => UserMethods.is_guest(me())

  return (
    <footer class="ol-foot footer">
      <Show when={uptimeDays() !== null}>
        <span class="ol-tabular">
          {t("home.footer.uptime_days", {
            days: uptimeDays()!.toLocaleString(),
          })}
        </span>
      </Show>
      <Show when={getSettingBool("footer_show_perf") && loadSec()}>
        <span class="ol-tabular">
          {t("home.footer.load_time", { sec: loadSec() })}
        </span>
      </Show>
      <For each={customLinks()}>
        {(item) => (
          <Show
            when={item.url.startsWith("/")}
            fallback={
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.label}
              </a>
            }
          >
            <LinkWithBase href={item.url}>{item.label}</LinkWithBase>
          </Show>
        )}
      </For>
      <LinkWithBase href={isGuest() ? "/@login" : "/@manage"}>
        {t(isGuest() ? "login.login" : "home.footer.manage")}
      </LinkWithBase>
      <a
        href="https://github.com/OpenListTeam/OpenList"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("home.footer.powered_by")}
      </a>
    </footer>
  )
}
