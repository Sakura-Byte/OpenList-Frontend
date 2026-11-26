import { useColorMode } from "@hope-ui/solid"
import { createEffect } from "solid-js"
import { getMainColor, getSettingNumber } from "~/store"

export type ModernThemeMode = "light" | "dark"

export function syncSiteThemeTokens(
  mode: ModernThemeMode,
  mainColor?: string,
  blurPx?: number,
) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.dataset.modernTheme = mode
  const resolvedMain = (mainColor || getMainColor() || "#1890ff").trim()
  root.style.setProperty("--site-main", resolvedMain)
  const rawBlur =
    blurPx !== undefined ? blurPx : getSettingNumber("appearance_blur_px", 18)
  const clampedBlur = Math.min(
    Math.max(Number.isFinite(rawBlur) ? rawBlur : 18, 0),
    40,
  )
  root.style.setProperty("--ol-wallpaper-blur", `${clampedBlur}px`)
}

export function toggleThemeWithTransition(toggleFn: () => void) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    toggleFn()
    return
  }
  const prefersReduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  const docWithVT = document as Document & {
    startViewTransition?: (cb: () => void) => unknown
  }
  if (prefersReduced || typeof docWithVT.startViewTransition !== "function") {
    toggleFn()
    return
  }
  try {
    docWithVT.startViewTransition(() => {
      toggleFn()
    })
  } catch {
    toggleFn()
  }
}

export function useThemeSync(readySignal?: () => unknown) {
  const { colorMode } = useColorMode()
  createEffect(() => {
    readySignal?.()
    const mode: ModernThemeMode = colorMode() === "dark" ? "dark" : "light"
    syncSiteThemeTokens(mode)
  })
}
