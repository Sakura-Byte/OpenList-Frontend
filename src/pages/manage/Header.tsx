import { useColorMode } from "@hope-ui/solid"
import { Link } from "@solidjs/router"
import {
  TbBook2,
  TbExternalLink,
  TbHome,
  TbLanguage,
  TbLogout,
  TbMenu2,
  TbMoon,
  TbSun,
  TbX,
} from "solid-icons/tb"
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js"
import { Portal } from "solid-js/web"
import { SwitchLanguage } from "~/components"
import { SiteLogo } from "~/components/icons-tb"
import { useFetch, useRouter, useT } from "~/hooks"
import { getSetting, me } from "~/store"
import { PResp } from "~/types"
import { changeToken, handleResp, joinBase, notify, r } from "~/utils"
import { toggleThemeWithTransition } from "~/utils/theme_sync"
import { SideMenu } from "./SideMenu"
import { side_menu_groups } from "./sidemenu_items"

const [drawerOpen, setDrawerOpen] = createSignal(false)
const onOpen = () => setDrawerOpen(true)
const onClose = () => setDrawerOpen(false)

export function useAdminBrand() {
  const { colorMode } = useColorMode()
  const isDark = () => colorMode() === "dark"

  const logoUrl = createMemo(() => {
    const raw = (getSetting("logo") || "").trim()
    if (!raw) return ""
    const lines = raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length === 0) return ""
    if (isDark() && lines.length > 1) return lines[lines.length - 1]
    return lines[0]
  })

  const siteTitle = () => getSetting("site_title") || "OpenList"
  return { isDark, logoUrl, siteTitle }
}

export function useAdminLogout() {
  const t = useT()
  const { to } = useRouter()
  const [loading, req] = useFetch((): PResp<unknown> => r.get("/auth/logout"))

  const logOut = async () => {
    handleResp(await req(), () => {
      changeToken()
      onClose()
      notify.success(t("manage.logout_success"))
      to(`/@login?redirect=${encodeURIComponent(location.pathname)}`)
    })
  }

  return { logOut, logOutLoading: loading }
}

export const AdminSidebarFooter = () => {
  const t = useT()
  const { colorMode, toggleColorMode } = useColorMode()
  const isDark = () => colorMode() === "dark"
  const { logOut, logOutLoading } = useAdminLogout()

  return (
    <div class="ol-admin-sidebar__footer">
      <a
        class="ol-admin-nav-item"
        href={joinBase("/")}
        onClick={(e) => {
          e.preventDefault()
          onClose()
          window.open(joinBase("/"), "_self")
        }}
      >
        <TbHome size={17} class="ol-ico" />
        <span class="ol-admin-nav-item__label">
          {t("manage.common.back_home")}
        </span>
        <TbExternalLink size={14} class="ol-ico ol-admin-nav-item__ext" />
      </a>

      <div class="ol-admin-sidebar__tools">
        <div class="ol-admin-sidebar__tools-group">
          <SwitchLanguage
            as="button"
            type="button"
            class="ol-icon-btn"
            aria-label="Language"
            title="Language"
          >
            <TbLanguage size={17} class="ol-ico" />
          </SwitchLanguage>

          <button
            type="button"
            class="ol-icon-btn"
            title={t("home.toolbar.toggle_theme")}
            aria-label={t("home.toolbar.toggle_theme")}
            onClick={() => toggleThemeWithTransition(toggleColorMode)}
          >
            {isDark() ? (
              <TbSun size={17} class="ol-ico" />
            ) : (
              <TbMoon size={17} class="ol-ico" />
            )}
          </button>

          <a
            class="ol-icon-btn"
            href="https://doc.oplist.org"
            target="_blank"
            rel="noopener noreferrer"
            title={t("manage.sidemenu.docs")}
            aria-label={t("manage.sidemenu.docs")}
          >
            <TbBook2 size={17} class="ol-ico" />
          </a>
        </div>

        <div class="ol-admin-sidebar__tools-group">
          <Show when={me()?.username}>
            <span class="ol-admin-sidebar__user" title={me().username}>
              {me().username}
            </span>
          </Show>
          <button
            type="button"
            class="ol-icon-btn ol-icon-btn--danger"
            disabled={logOutLoading()}
            onClick={logOut}
            title={t("home.toolbar.logout", undefined, "Logout")}
            aria-label={t("home.toolbar.logout", undefined, "Logout")}
          >
            <TbLogout size={17} class="ol-ico" />
          </button>
        </div>
      </div>
    </div>
  )
}

const Header = () => {
  const t = useT()
  const { toggleColorMode } = useColorMode()
  const { isDark, logoUrl, siteTitle } = useAdminBrand()
  const { logOut, logOutLoading } = useAdminLogout()

  onMount(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen()) {
        onClose()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    onCleanup(() => window.removeEventListener("keydown", onKeyDown))
  })

  return (
    <>
      <header class="ol-admin-mobile-bar">
        <div class="ol-admin-mobile-bar__left">
          <button
            type="button"
            class="ol-icon-btn"
            aria-label="Menu"
            onClick={onOpen}
          >
            <TbMenu2 size={19} class="ol-ico" />
          </button>
          <Link
            class="ol-admin-mobile-bar__brand"
            href={joinBase("/@manage")}
            onClick={onClose}
          >
            <SiteLogo src={logoUrl()} title={siteTitle()} size={24} />
            <span>{t("manage.title")}</span>
          </Link>
        </div>

        <div class="ol-admin-mobile-bar__right">
          <a
            class="ol-icon-btn"
            href={joinBase("/")}
            title={t("manage.common.back_home")}
            aria-label={t("manage.common.back_home")}
            onClick={(e) => {
              e.preventDefault()
              window.open(joinBase("/"), "_self")
            }}
          >
            <TbHome size={17} class="ol-ico" />
          </a>
          <button
            type="button"
            class="ol-icon-btn"
            title={t("home.toolbar.toggle_theme")}
            aria-label={t("home.toolbar.toggle_theme")}
            onClick={() => toggleThemeWithTransition(toggleColorMode)}
          >
            {isDark() ? (
              <TbSun size={17} class="ol-ico" />
            ) : (
              <TbMoon size={17} class="ol-ico" />
            )}
          </button>
          <button
            type="button"
            class="ol-icon-btn ol-icon-btn--danger"
            disabled={logOutLoading()}
            onClick={logOut}
            aria-label="Logout"
          >
            <TbLogout size={17} class="ol-ico" />
          </button>
        </div>
      </header>

      <Show when={drawerOpen()}>
        <Portal>
          <div
            class="ol-modern-scope"
            data-modern-theme={isDark() ? "dark" : "light"}
          >
            <div class="ol-admin-drawer-backdrop" onClick={onClose} />
            <aside class="ol-admin-drawer" role="dialog" aria-modal="true">
              <div class="ol-admin-drawer__head">
                <Link
                  class="ol-admin-mobile-bar__brand"
                  href={joinBase("/@manage")}
                  onClick={onClose}
                >
                  <SiteLogo src={logoUrl()} title={siteTitle()} size={26} />
                  <span>{siteTitle()}</span>
                </Link>
                <button
                  type="button"
                  class="ol-icon-btn"
                  aria-label="Close"
                  onClick={onClose}
                >
                  <TbX size={18} class="ol-ico" />
                </button>
              </div>
              <div class="ol-admin-sidebar__scroll">
                <SideMenu groups={side_menu_groups} />
              </div>
              <AdminSidebarFooter />
            </aside>
          </div>
        </Portal>
      </Show>
    </>
  )
}

export { Header, onClose }
