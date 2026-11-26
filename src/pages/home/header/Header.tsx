import { useColorMode } from "@hope-ui/solid"
import { Show, createMemo } from "solid-js"
import { LinkWithBase } from "~/components"
import {
  ILogin,
  IMoon,
  ISearch,
  ISettings,
  ISun,
  SiteLogo,
} from "~/components/icons-tb"
import { useRouter, useT } from "~/hooks"
import { State, getSetting, local, me, objStore } from "~/store"
import { UserMethods } from "~/types"
import { bus } from "~/utils"
import { isMac } from "~/utils/compatibility"
import { toggleThemeWithTransition } from "~/utils/theme_sync"
import { Layout } from "./layout"

export const Header = () => {
  const t = useT()
  const { colorMode, toggleColorMode } = useColorMode()
  const { isShare, pathname } = useRouter()

  const isDark = () => colorMode() === "dark"

  const logoUrl = createMemo(() => {
    const raw = (getSetting("logo") || "").trim()
    if (!raw) return ""
    const lines = raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length === 0) return ""
    if (isDark() && lines.length > 1) {
      return lines[lines.length - 1]
    }
    return lines[0]
  })

  const siteTitle = () => getSetting("site_title") || "OpenList"

  const homeHref = createMemo(() => {
    if (!isShare()) return "/"
    const segs = pathname().split("/").filter(Boolean)
    return `/@s/${segs[1] ?? ""}`
  })

  const isSticky = () => local["position_of_header_navbar"] !== "static"

  const showSearch = () =>
    [State.Folder, State.FetchingMore].includes(objStore.state) &&
    (getSetting("search_index") !== "none" || objStore.search_available)

  const isGuest = () => UserMethods.is_guest(me())

  return (
    <header class="ol-bar header" data-sticky={isSticky() ? "true" : "false"}>
      <LinkWithBase
        class="ol-brand header-left"
        href={homeHref()}
        title={siteTitle()}
      >
        <SiteLogo src={logoUrl()} title={siteTitle()} size={28} />
        <span class="ol-brand__title">{siteTitle()}</span>
      </LinkWithBase>

      <div class="ol-bar__spacer" />

      <Show when={showSearch()}>
        <button
          type="button"
          class="ol-search-trigger"
          onClick={() => bus.emit("tool", "search")}
        >
          <ISearch size={16} />
          <span>{t("home.search.search")}</span>
          <kbd class="ol-kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </button>
      </Show>

      <div class="ol-bar__tools header-right">
        <Show
          when={[State.Folder, State.FetchingMore].includes(objStore.state)}
        >
          <Layout />
        </Show>

        <button
          type="button"
          class="ol-icon-btn"
          title={t("home.toolbar.toggle_theme")}
          aria-label={t("home.toolbar.toggle_theme")}
          onClick={() => toggleThemeWithTransition(toggleColorMode)}
        >
          {isDark() ? <ISun size={17} /> : <IMoon size={17} />}
        </button>

        <Show when={!isShare()}>
          <LinkWithBase
            class="ol-icon-btn"
            href={isGuest() ? "/@login" : "/@manage"}
            title={t(isGuest() ? "login.login" : "home.footer.manage")}
            aria-label={t(isGuest() ? "login.login" : "home.footer.manage")}
          >
            {isGuest() ? <ILogin size={17} /> : <ISettings size={17} />}
          </LinkWithBase>
        </Show>
      </div>
    </header>
  )
}
