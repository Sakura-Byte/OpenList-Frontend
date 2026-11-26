import { Progress, ProgressIndicator, useColorMode } from "@hope-ui/solid"
import { Route, Routes, useIsRouting } from "@solidjs/router"
import {
  Component,
  Match,
  Switch,
  createEffect,
  createSignal,
  lazy,
  onCleanup,
} from "solid-js"
import { Portal } from "solid-js/web"
import { Error, FullScreenLoading } from "~/components"
import { useRouter, useT } from "~/hooks"
import {
  applyFallbackAnnouncementIfNeeded,
  ensurePublicChannelsLoaded,
  hydrateNoticesFromBootstrap,
  hydratePromotionsFromBootstrap,
  promotions,
  setSettings,
} from "~/store"
import { setArchiveExtensions } from "~/store/archive"
import { InitStatus, Resp } from "~/types"
import {
  base_path,
  bus,
  handleRespWithoutAuthAndNotify,
  initPluginEngine,
  r,
} from "~/utils"
import { getBootstrapData } from "~/utils/config"
import { applyCustomize } from "~/utils/customize"
import { createMatomoSpaBridge } from "~/utils/matomo"
import { syncSiteThemeTokens, useThemeSync } from "~/utils/theme_sync"
import { MustUser, UserOrGuest } from "./MustUser"
import "./index.css"
import { globalStyles } from "./theme"

const Home = lazy(() => import("~/pages/home/Layout"))
const Manage = lazy(() => import("~/pages/manage"))
const Login = lazy(() => import("~/pages/login"))
const Init = lazy(() => import("~/pages/init"))
const Test = lazy(() => import("~/pages/test"))

const App: Component = () => {
  const t = useT()
  const { colorMode } = useColorMode()
  globalStyles()
  initPluginEngine()
  const isRouting = useIsRouting()
  const { to, pathname } = useRouter()
  const matomo = createMatomoSpaBridge()
  const [settingsVersion, setSettingsVersion] = createSignal(0)
  useThemeSync(settingsVersion)

  const onTo = (path: string) => {
    to(path)
  }
  bus.on("to", onTo)
  onCleanup(() => {
    bus.off("to", onTo)
    matomo.cleanup()
  })

  createEffect(() => {
    bus.emit("pathname", pathname())
    matomo.trackRouteChange()
  })

  // Synchronous 0-RTT hydration from window.__OPENLIST_BOOTSTRAP__ when injected by Go server
  const boot = getBootstrapData()
  const bootSettingsReady = Boolean(
    boot?.settings && Object.keys(boot.settings).length > 0,
  )
  const bootArchiveReady = Array.isArray(boot?.archive_extensions)
  const bootInitReady = typeof boot?.initialized === "boolean"

  if (bootSettingsReady && boot?.settings) {
    setSettings(boot.settings)
    syncSiteThemeTokens(colorMode() === "dark" ? "dark" : "light")
    applyCustomize()
  }
  if (bootArchiveReady && boot?.archive_extensions) {
    setArchiveExtensions(boot.archive_extensions)
  }
  const bootNoticesReady = hydrateNoticesFromBootstrap(boot?.notices)
  const bootPromosReady = hydratePromotionsFromBootstrap(boot?.promotions)
  if (bootSettingsReady && bootNoticesReady && bootPromosReady) {
    applyFallbackAnnouncementIfNeeded(promotions().length > 0)
  }

  const [err, setErr] = createSignal<string[]>([])
  const [initialized, setInitialized] = createSignal(
    bootInitReady ? Boolean(boot!.initialized) : true,
  )
  const [loading, setLoading] = createSignal(!bootSettingsReady)

  ;(async () => {
    try {
      await Promise.all([
        bootSettingsReady
          ? Promise.resolve()
          : (async () => {
              const resp = (await r.get("/public/settings")) as Resp<
                Record<string, string>
              >
              handleRespWithoutAuthAndNotify(
                resp,
                (data) => {
                  setSettings(data)
                  setSettingsVersion((v) => v + 1)
                  syncSiteThemeTokens(colorMode() === "dark" ? "dark" : "light")
                  applyCustomize()
                },
                (e, code) => {
                  if (code === 503) return
                  setErr((prev) => prev.concat(e))
                },
              )
            })(),
        bootArchiveReady
          ? Promise.resolve()
          : (async () => {
              handleRespWithoutAuthAndNotify(
                (await r.get("/public/archive_extensions")) as Resp<string[]>,
                setArchiveExtensions,
              )
            })(),
        bootInitReady
          ? Promise.resolve()
          : (async () => {
              handleRespWithoutAuthAndNotify(
                (await r.get("/public/init_status")) as Resp<InitStatus>,
                (data) => setInitialized(data.initialized),
              )
            })(),
      ])
      await ensurePublicChannelsLoaded()
    } finally {
      setLoading(false)
    }
  })()

  createEffect(() => {
    if (initialized() === false && !pathname().startsWith("/@init")) {
      to("/@init", true)
    }
  })

  return (
    <>
      <Portal>
        <Progress
          indeterminate
          size="xs"
          position="fixed"
          top="0"
          left="0"
          right="0"
          zIndex="$banner"
          d={isRouting() ? "block" : "none"}
        >
          <ProgressIndicator />
        </Progress>
      </Portal>
      <Switch
        fallback={
          <Routes base={base_path}>
            <Route path="/@test" component={Test} />
            <Route path="/@login" component={Login} />
            <Route path="/@init" component={Init} />
            <Route
              path="/@manage/*"
              element={
                <MustUser>
                  <Manage />
                </MustUser>
              }
            />
            <Route
              path={["/@s/*", "/%40s/*"]}
              element={
                <UserOrGuest>
                  <Home />
                </UserOrGuest>
              }
            />
            <Route
              path="*"
              element={
                <MustUser>
                  <Home />
                </MustUser>
              }
            />
          </Routes>
        }
      >
        <Match when={err().length > 0}>
          <Error
            h="100vh"
            msg={
              t("home.fetching_settings_failed") +
              err()
                .map((e) => t("home." + e))
                .join(", ")
            }
          />
        </Match>
        <Match when={loading()}>
          <FullScreenLoading />
        </Match>
      </Switch>
    </>
  )
}

export default App
