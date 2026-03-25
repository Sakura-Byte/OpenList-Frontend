const OBSERVED_ATTRIBUTES = [
  "href",
  "src",
  "data-track-content",
  "data-content-name",
  "data-content-piece",
  "data-content-target",
  "class",
  "style",
]

const CONTENT_BLOCK_SELECTOR = "[data-track-content], .matomoTrackContent"
const CONTENT_NAME_SELECTOR = "[data-content-name], .matomoContentName"
const CONTENT_PIECE_SELECTOR = [
  "[data-content-piece]",
  ".matomoContentPiece",
  "img[src]",
  "video[src]",
  "audio[src]",
  "source[src]",
  "object[data]",
  "embed[src]",
].join(", ")
const CONTENT_TARGET_SELECTOR = [
  "[data-content-target]",
  ".matomoContentTarget",
  "a[href]",
  "area[href]",
].join(", ")

type MatomoCommand = [string, ...unknown[]]
type ContentPayload = {
  name: string
  piece: string
  target: string
}

const hasMatomo = () => typeof window._paq?.push === "function"

const pushMatomo = (command: MatomoCommand) => {
  if (!hasMatomo()) return
  window._paq.push(command)
}

const normalize = (value?: string | null) => value?.trim() ?? ""

const toAbsoluteUrl = (value: string) => {
  if (!value) return ""
  try {
    return new URL(value, location.href).href
  } catch {
    return value
  }
}

const findFirstElement = (root: Element, selector: string) => {
  if (root.matches(selector)) return root
  return root.querySelector(selector)
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

const getElementResource = (element: Element | null) => {
  if (!element) return ""

  const htmlElement = element as HTMLElement
  const currentSrc = (htmlElement as HTMLImageElement).currentSrc
  if (currentSrc) return toAbsoluteUrl(currentSrc)

  for (const attr of ["data-content-piece", "src", "data", "poster"]) {
    const value = normalize(element.getAttribute(attr))
    if (value) return toAbsoluteUrl(value)
  }

  return ""
}

const getContentName = (block: HTMLElement) => {
  const element = findFirstElement(block, CONTENT_NAME_SELECTOR)
  const dataName = normalize(element?.getAttribute("data-content-name"))
  if (dataName) return dataName

  const text = normalize(element?.textContent)
  if (text) return text.slice(0, 200)

  const title = normalize(block.getAttribute("title"))
  if (title) return title

  return ""
}

const getContentPiece = (block: HTMLElement) => {
  const element = findFirstElement(block, CONTENT_PIECE_SELECTOR)
  const dataPiece = normalize(element?.getAttribute("data-content-piece"))
  if (dataPiece) return dataPiece

  const resource = getElementResource(element)
  if (resource) return resource

  return ""
}

const getContentTarget = (block: HTMLElement) => {
  const element = findFirstElement(block, CONTENT_TARGET_SELECTOR)
  const explicitTarget = normalize(element?.getAttribute("data-content-target"))
  if (explicitTarget) return toAbsoluteUrl(explicitTarget)

  const href = normalize(element?.getAttribute("href"))
  if (href) return toAbsoluteUrl(href)

  return ""
}

const getContentPayload = (block: HTMLElement): ContentPayload => {
  const piece = getContentPiece(block)
  const target = getContentTarget(block)
  const name = getContentName(block) || piece || target || "content"

  return {
    name,
    piece: piece || "unknown",
    target,
  }
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

    const payload = getContentPayload(block)
    pushMatomo([
      "trackContentImpression",
      payload.name,
      payload.piece,
      payload.target,
    ])
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

  const clickHandler = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return

    const clickedTarget = event.target.closest(CONTENT_TARGET_SELECTOR)
    const block = event.target.closest(
      CONTENT_BLOCK_SELECTOR,
    ) as HTMLElement | null

    if (!clickedTarget || !block || !block.contains(clickedTarget)) return
    if (!hasMatomo()) return

    const payload = getContentPayload(block)
    pushMatomo([
      "trackContentInteraction",
      "click",
      payload.name,
      payload.piece,
      payload.target,
    ])
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

  document.addEventListener("click", clickHandler, true)
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
      document.removeEventListener("click", clickHandler, true)
      window.removeEventListener("scroll", viewportSync)
      window.removeEventListener("resize", viewportSync)
      window.onMDRender = previousOnMDRender
    },
  }
}
