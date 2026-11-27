import { useColorMode } from "@hope-ui/solid"
import { Link, Route, Routes } from "@solidjs/router"
import { createMemo, For, onCleanup, onMount, Suspense } from "solid-js"
import { FullLoading } from "~/components"
import { SiteLogo } from "~/components/icons-tb"
import { useT, useTitle } from "~/hooks"
import { joinBase } from "~/utils"
import { getBackendKind } from "~/utils/backend"
import { AdminSidebarFooter, Header, onClose, useAdminBrand } from "./Header"
import "./manage.css"
import { routes } from "./routes"
import { SideMenu } from "./SideMenu"
import { side_menu_groups } from "./sidemenu_items"

const Manage = () => {
  const t = useT()
  const { colorMode } = useColorMode()
  const { logoUrl, siteTitle } = useAdminBrand()
  useTitle(() => t("manage.title"))

  onMount(() => {
    document.body.dataset.olAdminPortal = "true"
    onCleanup(() => {
      delete document.body.dataset.olAdminPortal
    })
  })

  const visibleRoutes = createMemo(() =>
    routes.filter((r) => !r.backend || r.backend.includes(getBackendKind())),
  )

  return (
    <div
      class="ol-modern-scope ol-admin"
      data-modern-theme={colorMode() === "dark" ? "dark" : "light"}
    >
      <div class="ol-admin-shell">
        <aside class="ol-admin-sidebar">
          <Link
            class="ol-admin-sidebar__brand"
            href={joinBase("/@manage")}
            onClick={onClose}
          >
            <SiteLogo src={logoUrl()} title={siteTitle()} size={28} />
            <span class="ol-admin-sidebar__brand-text">
              <span class="ol-admin-sidebar__brand-title">{siteTitle()}</span>
              <span class="ol-admin-sidebar__brand-sub">
                {t("manage.title")}
              </span>
            </span>
          </Link>

          <div class="ol-admin-sidebar__scroll">
            <SideMenu groups={side_menu_groups} />
          </div>

          <AdminSidebarFooter />
        </aside>

        <Header />

        <main class="ol-admin-main">
          <Suspense fallback={<FullLoading />}>
            <Routes>
              <For each={visibleRoutes()}>
                {(route) => (
                  <Route path={route.to} component={route.component} />
                )}
              </For>
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default Manage
