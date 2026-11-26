import { useColorMode } from "@hope-ui/solid"
import { clsx } from "clsx"
import {
  Show,
  createEffect,
  createMemo,
  on,
  onCleanup,
  onMount,
} from "solid-js"
import { NoticeModal } from "~/components/NoticeModal"
import { PromoPopupModal } from "~/components/PromoPopupModal"
import { useRouter, useTitle } from "~/hooks"
import {
  getSetting,
  haveSelected,
  local,
  noticesLoaded,
  orchestrateVisitModals,
  promotionsLoaded,
  selectAll,
} from "~/store"
import { Body } from "./Body"
import { Footer } from "./Footer"
import { Toolbar } from "./toolbar/Toolbar"

const Index = () => {
  useTitle(getSetting("site_title"))
  const { colorMode } = useColorMode()
  const { pathname } = useRouter()
  let homeEl: HTMLDivElement | undefined

  const isDark = () => colorMode() === "dark"

  const wallpaperUrl = createMemo(() => {
    const raw = (getSetting("appearance_wallpaper") || "").trim()
    if (!raw) return ""
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length === 0) return ""
    if (isDark() && lines[1]) return lines[1]
    return lines[0]
  })

  const surfaceMode = createMemo<"glass" | "solid">(() => {
    const raw = (getSetting("appearance_surface_mode") || "solid").trim()
    return raw === "glass" ? "glass" : "solid"
  })

  createEffect(() => {
    if (noticesLoaded() && promotionsLoaded()) {
      orchestrateVisitModals(pathname())
    }
  })

  let prevPath = pathname()
  createEffect(
    on(
      pathname,
      (next) => {
        const last = prevPath
        prevPath = next
        if (!homeEl || next === last) return
        const depth = (p: string) => p.split("/").filter(Boolean).length
        const dir = Math.sign(depth(next) - depth(last))
        const reduce =
          window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
          false
        const dx = reduce ? 0 : dir * 10
        homeEl.querySelectorAll<HTMLElement>(".ol-nav-body").forEach((el) => {
          el.animate?.(
            [
              { opacity: 0, transform: `translateX(${dx}px)` },
              { opacity: 1, transform: "translateX(0)" },
            ],
            { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
          )
        })
      },
      { defer: true },
    ),
  )

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && haveSelected()) {
        selectAll(false)
      }
    }
    window.addEventListener("keydown", onKey)
    onCleanup(() => window.removeEventListener("keydown", onKey))
  })

  return (
    <div
      ref={homeEl}
      class="ol-modern-scope ol-home"
      data-modern-theme={isDark() ? "dark" : "light"}
      data-wallpaper={wallpaperUrl() ? "on" : "off"}
      data-surface={surfaceMode()}
    >
      <Show when={wallpaperUrl()}>
        <div
          class="ol-home__wallpaper"
          style={{ "background-image": `url("${wallpaperUrl()}")` }}
        />
      </Show>
      <div
        class={clsx(
          "ol-home__inner",
          local["show_sidebar"] === "visible" && "ol-home__inner--wide",
        )}
      >
        <Body />
        <Footer />
      </div>
      <Toolbar />
      <NoticeModal />
      <PromoPopupModal />
    </div>
  )
}

export default Index
