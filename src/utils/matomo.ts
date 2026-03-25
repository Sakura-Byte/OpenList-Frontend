const MATOMO_OBSERVED_ATTRIBUTES = [
  "href",
  "src",
  "data-track-content",
  "data-content-name",
  "data-content-piece",
  "data-content-target",
]

type MatomoCommand = [string, ...unknown[]]

const hasMatomo = () => Array.isArray(window._paq)

const pushMatomo = (command: MatomoCommand) => {
  if (!hasMatomo()) return
  window._paq.push(command)
}

const getTrackedRoot = () =>
  document.getElementById("root") ?? document.body ?? document.documentElement

export const createMatomoSpaBridge = () => {
  let previousUrl = location.href
  let routeReady = false
  let domSyncTimer: number | undefined
  let pageViewTimer: number | undefined

  const previousOnMDRender = window.onMDRender

  const syncDom = () => {
    const root = getTrackedRoot()
    if (!root) return

    pushMatomo(["enableLinkTracking"])
    pushMatomo(["trackContentImpressionsWithinNode", root])
  }

  const scheduleDomSync = (delay = 200) => {
    if (!hasMatomo()) return

    window.clearTimeout(domSyncTimer)
    domSyncTimer = window.setTimeout(syncDom, delay)
  }

  window.onMDRender = () => {
    previousOnMDRender?.()
    scheduleDomSync()
  }

  const observer = new MutationObserver(() => {
    scheduleDomSync()
  })

  const root = getTrackedRoot()
  if (root) {
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: MATOMO_OBSERVED_ATTRIBUTES,
    })
  }

  scheduleDomSync(600)

  return {
    trackRouteChange: () => {
      const currentUrl = location.href

      if (!routeReady) {
        routeReady = true
        previousUrl = currentUrl
        scheduleDomSync(300)
        return
      }

      if (currentUrl === previousUrl) {
        scheduleDomSync(150)
        return
      }

      if (!hasMatomo()) {
        previousUrl = currentUrl
        return
      }

      window.clearTimeout(pageViewTimer)
      pageViewTimer = window.setTimeout(() => {
        pushMatomo(["setReferrerUrl", previousUrl])
        pushMatomo(["setCustomUrl", currentUrl])
        pushMatomo(["setDocumentTitle", document.title])
        pushMatomo(["trackPageView"])
        scheduleDomSync(150)
        previousUrl = currentUrl
      }, 50)
    },
    cleanup: () => {
      window.clearTimeout(domSyncTimer)
      window.clearTimeout(pageViewTimer)
      observer.disconnect()

      if (window.onMDRender === previousOnMDRender) {
        return
      }
      window.onMDRender = previousOnMDRender
    },
  }
}
