const OBSERVED_ATTRIBUTES = [
  "href",
  "src",
  "data-track-content",
  "data-content-name",
  "data-content-piece",
  "data-content-target",
  "data-content-ignoreinteraction",
  "class",
  "style",
]

const CONTENT_BLOCK_SELECTOR = "[data-track-content], .matomoTrackContent"

type MatomoCommand = [string, ...unknown[]]

const hasMatomo = () => typeof window._paq?.push === "function"

const pushMatomo = (command: MatomoCommand) => {
  if (!hasMatomo()) return
  window._paq.push(command)
}

const queryContentBlocks = (root: ParentNode | Element) => {
  const blocks: HTMLElement[] = []

  if (root instanceof Element && root.matches(CONTENT_BLOCK_SELECTOR)) {
    blocks.push(root as HTMLElement)
  }

  if ("querySelectorAll" in root) {
    root.querySelectorAll(CONTENT_BLOCK_SELECTOR).forEach((block) => {
      blocks.push(block as HTMLElement)
    })
  }

  return blocks
}

const isElementVisible = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false

  const style = window.getComputedStyle(element)
  if (style.display === "none" || style.visibility === "hidden") return false

  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  )
}

export const createMatomoSpaBridge = () => {
  let previousUrl = location.href
  let currentPageKey = location.href
  let routeReady = false
  let scanTimer: number | undefined
  let pageViewTimer: number | undefined

  const previousOnMDRender = window.onMDRender
  const observedBlocks = new WeakSet<HTMLElement>()
  const impressedPages = new WeakMap<HTMLElement, string>()

  const trackImpression = (block: HTMLElement) => {
    if (!hasMatomo() || !isElementVisible(block)) return
    if (impressedPages.get(block) === currentPageKey) return

    // Delegate block/name/piece/target resolution back to Matomo so report
    // dimensions stay aligned with the declarative content-tracking markup.
    pushMatomo(["trackContentImpressionsWithinNode", block])
    impressedPages.set(block, currentPageKey)
  }

  const observeBlocks = (root: ParentNode | Element = document) => {
    queryContentBlocks(root).forEach((block) => {
      if (observedBlocks.has(block)) return
      observedBlocks.add(block)
      intersectionObserver?.observe(block)
    })
  }

  const scanVisibleBlocks = (root: ParentNode | Element = document) => {
    queryContentBlocks(root).forEach(trackImpression)
    pushMatomo(["enableLinkTracking"])
  }

  const runScan = (root: ParentNode | Element = document) => {
    observeBlocks(root)
    scanVisibleBlocks(root)
  }

  const scheduleScan = (delay = 150, root: ParentNode | Element = document) => {
    window.clearTimeout(scanTimer)
    scanTimer = window.setTimeout(() => {
      runScan(root)
    }, delay)
  }

  const viewportSync = () => scheduleScan(50)

  let intersectionObserver: IntersectionObserver | undefined
  if ("IntersectionObserver" in window) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          trackImpression(entry.target as HTMLElement)
        })
      },
      {
        threshold: [0, 0.1],
      },
    )
  }

  const mutationObserver = new MutationObserver((records) => {
    for (const record of records) {
      if (record.target instanceof Element) {
        observeBlocks(record.target)
      }

      record.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          observeBlocks(node)
        }
      })
    }

    scheduleScan()
  })

  const trackedRoot =
    document.getElementById("root") ?? document.body ?? document.documentElement

  if (trackedRoot) {
    mutationObserver.observe(trackedRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: OBSERVED_ATTRIBUTES,
    })
  }

  window.addEventListener("scroll", viewportSync, { passive: true })
  window.addEventListener("resize", viewportSync)

  window.onMDRender = () => {
    previousOnMDRender?.()
    scheduleScan()
  }

  runScan()

  return {
    trackRouteChange: () => {
      const currentUrl = location.href
      currentPageKey = currentUrl

      if (!routeReady) {
        routeReady = true
        previousUrl = currentUrl
        scheduleScan(250)
        return
      }

      if (currentUrl === previousUrl) {
        scheduleScan(120)
        return
      }

      if (!hasMatomo()) {
        previousUrl = currentUrl
        scheduleScan(250)
        return
      }

      window.clearTimeout(pageViewTimer)
      pageViewTimer = window.setTimeout(() => {
        pushMatomo(["setReferrerUrl", previousUrl])
        pushMatomo(["setCustomUrl", currentUrl])
        pushMatomo(["setDocumentTitle", document.title])
        pushMatomo(["trackPageView"])
        previousUrl = currentUrl
        scheduleScan(200)
      }, 50)
    },
    cleanup: () => {
      window.clearTimeout(scanTimer)
      window.clearTimeout(pageViewTimer)

      mutationObserver.disconnect()
      intersectionObserver?.disconnect()
      window.removeEventListener("scroll", viewportSync)
      window.removeEventListener("resize", viewportSync)
      window.onMDRender = previousOnMDRender
    },
  }
}
