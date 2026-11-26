import * as i18n from "@solid-primitives/i18n"
import { createResource, createSignal } from "solid-js"
export { i18n }

// Glob language names eagerly (tiny 1-line index.json per locale)
const langs = import.meta.glob("~/lang/*/index.json", {
  eager: true,
  import: "lang",
})

export const languages = Object.keys(langs).map((langPath) => {
  const langCode = langPath.split("/")[3]
  const langName = langs[langPath] as string
  return { code: langCode, lang: langName }
})

const userLang = navigator.language.toLowerCase()
const defaultLang =
  languages.find((lang) => lang.code.toLowerCase() === userLang)?.code ||
  languages.find(
    (lang) => lang.code.toLowerCase().split("-")[0] === userLang.split("-")[0],
  )?.code ||
  "en"

export let initialLang = localStorage.getItem("lang") ?? defaultLang

if (!languages.some((lang) => lang.code === initialLang)) {
  initialLang = defaultLang
}

// Type-only import keeps full en/entry.ts out of initial bundle while preserving strict keys
import type * as en from "~/lang/en/entry"

export type Lang = keyof typeof langs
export type RawDictionary = typeof en.dict
export type Dictionary = i18n.Flatten<RawDictionary>

// Lazy per-namespace JSON loaders (allows visitor routes to skip 62KB+ drivers/admin JSONs)
const langJsonLoaders = import.meta.glob<Record<string, unknown>>(
  "~/lang/*/*.json",
  {
    import: "default",
  },
)

// Lazy fork-specific overrides per locale
const extraDictLoaders = import.meta.glob<Partial<RawDictionary>>(
  "~/lang_extra/*.json",
  {
    import: "default",
  },
)

const VISITOR_NAMESPACES = [
  "global",
  "home",
  "manage",
  "users",
  "login",
  "init",
  "shares",
  "indexes",
  "metas",
  "notices",
  "promotions",
  "jmcomic",
  "index",
] as const

const ADMIN_NAMESPACES = [
  "drivers",
  "settings",
  "settings_other",
  "storages",
  "tasks",
  "plugins",
  "br",
] as const

function isInitialAdminRoute(): boolean {
  if (typeof window === "undefined") return false
  const p = window.location.pathname
  return p.includes("/@manage") || p.includes("/%40manage")
}

const [includeAdmin, setIncludeAdmin] = createSignal(isInitialAdminRoute())

const localePartCache = new Map<string, Dictionary>()

async function loadNamespaceGroup(
  locale: string,
  namespaces: readonly string[],
): Promise<Dictionary> {
  const cacheKey = `${locale}:${namespaces === ADMIN_NAMESPACES ? "admin" : "visitor"}`
  const cached = localePartCache.get(cacheKey)
  if (cached) return cached

  const entries = await Promise.all(
    namespaces.map(async (ns) => {
      const loader = langJsonLoaders[`/src/lang/${locale}/${ns}.json`]
      if (!loader) return [ns, undefined] as const
      try {
        const mod = await loader()
        return [ns, mod] as const
      } catch {
        return [ns, undefined] as const
      }
    }),
  )

  const raw: Record<string, unknown> = {}
  for (const [ns, mod] of entries) {
    if (mod !== undefined) {
      raw[ns] = mod
    }
  }
  const flat = i18n.flatten(raw) as Dictionary
  localePartCache.set(cacheKey, flat)
  return flat
}

const extraCache = new Map<string, Partial<Dictionary>>()

async function loadExtraDict(locale: string): Promise<Partial<Dictionary>> {
  if (extraCache.has(locale)) return extraCache.get(locale)!
  const loader = extraDictLoaders[`/src/lang_extra/${locale}.json`]
  if (!loader) {
    extraCache.set(locale, {})
    return {}
  }
  try {
    const mod = await loader()
    const flat = i18n.flatten(mod) as Partial<Dictionary>
    extraCache.set(locale, flat)
    return flat
  } catch {
    extraCache.set(locale, {})
    return {}
  }
}

async function fetchScopedLocale(
  locale: string,
  withAdmin: boolean,
): Promise<Dictionary> {
  const [visitorPart, adminPart] = await Promise.all([
    loadNamespaceGroup(locale, VISITOR_NAMESPACES),
    withAdmin
      ? loadNamespaceGroup(locale, ADMIN_NAMESPACES)
      : Promise.resolve({} as Dictionary),
  ])
  return (
    withAdmin ? { ...visitorPart, ...adminPart } : visitorPart
  ) as Dictionary
}

const fetchDictionary = async ([locale, withAdmin]: readonly [
  Lang,
  boolean,
]): Promise<Dictionary> => {
  try {
    if (locale === "en") {
      return await fetchScopedLocale("en", withAdmin)
    }

    // Parallel load: active locale + English fallback + lang_extra overrides
    const [localeFlat, enFlat, extraFlat] = await Promise.all([
      fetchScopedLocale(locale, withAdmin),
      fetchScopedLocale("en", withAdmin),
      loadExtraDict(locale),
    ])

    return {
      ...enFlat,
      ...extraFlat,
      ...localeFlat,
    } as Dictionary
  } catch (err) {
    console.error(`Error loading dictionary for locale: ${locale}`, err)
    if (locale !== "en") {
      return await fetchScopedLocale("en", withAdmin)
    }
    throw new Error(`Failed to load dictionary for ${locale}`)
  }
}

export const [currentLang, setCurrentLang] = createSignal<Lang>(initialLang)

export const [dict, { mutate: mutateDict }] = createResource(
  () => [currentLang(), includeAdmin()] as const,
  fetchDictionary,
)

let adminLoadPromise: Promise<void> | null = null

/**
 * Ensures admin namespaces (`drivers`, `manage`, `settings`, `storages`, etc.)
 * are loaded and merged before `/@manage` mounts.
 */
export async function ensureAdminI18nLoaded(): Promise<void> {
  if (includeAdmin()) return
  if (!adminLoadPromise) {
    adminLoadPromise = (async () => {
      const merged = await fetchDictionary([currentLang(), true])
      mutateDict(() => merged)
      setIncludeAdmin(true)
    })().finally(() => {
      adminLoadPromise = null
    })
  }
  return adminLoadPromise
}
