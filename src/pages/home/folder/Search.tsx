import { useColorMode } from "@hope-ui/solid"
import { For, Show, createEffect, createSignal, on, onCleanup } from "solid-js"
import { Portal } from "solid-js/web"
import { FileIcon, ISearch, fileKind } from "~/components/icons-tb"
import { useFetch, usePath, useRouter, useT } from "~/hooks"
import { me, password } from "~/store"
import { SearchNode } from "~/types"
import {
  bus,
  encodePath,
  fsSearch,
  getFileSize,
  handleResp,
  joinBase,
  pathJoin,
} from "~/utils"
import { isMac } from "~/utils/compatibility"

type ScopeIndex = 0 | 1 | 2
const SCOPES = ["all", "folder", "file"] as const

function highlightName(text: string, query: string) {
  const q = query.trim()
  if (!q) return [{ t: text, m: false }]
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return [{ t: text, m: false }]
  return [
    { t: text.slice(0, idx), m: false },
    { t: text.slice(idx, idx + q.length), m: true },
    { t: text.slice(idx + q.length), m: false },
  ].filter((seg) => seg.t.length > 0)
}

const Search = () => {
  const pageSize = 100
  const t = useT()
  const { colorMode } = useColorMode()
  const { pathname, to } = useRouter()
  const { setPathAs } = usePath()

  const [open, setOpen] = createSignal(false)
  const [keywords, setKeywords] = createSignal("")
  const [scope, setScope] = createSignal<ScopeIndex>(0)
  const [active, setActive] = createSignal(0)
  const [results, setResults] = createSignal<SearchNode[]>([])
  const [loading, searchReq] = useFetch(fsSearch)

  let inputEl: HTMLInputElement | undefined
  let listEl: HTMLDivElement | undefined
  let debounceTimer: number | undefined
  let reqSeq = 0

  const close = () => setOpen(false)

  const onTool = (name: string) => {
    if (name === "search") {
      setOpen(true)
    }
  }
  bus.on("tool", onTool)

  const onGlobalKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || (isMac && e.metaKey)) && e.key.toLowerCase() === "k") {
      e.preventDefault()
      setOpen((v) => !v)
    }
  }
  document.addEventListener("keydown", onGlobalKeyDown)

  onCleanup(() => {
    bus.off("tool", onTool)
    document.removeEventListener("keydown", onGlobalKeyDown)
    window.clearTimeout(debounceTimer)
  })

  createEffect(() => {
    if (!open()) return
    queueMicrotask(() => inputEl?.focus())
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    onCleanup(() => {
      document.body.style.overflow = prevOverflow
    })
  })

  const runSearch = async (kw: string, sc: ScopeIndex) => {
    const trimmed = kw.trim()
    if (!trimmed) {
      setResults([])
      return
    }
    const mySeq = ++reqSeq
    const resp = await searchReq(
      pathname(),
      trimmed,
      password(),
      sc,
      1,
      pageSize,
    )
    if (mySeq !== reqSeq) return
    handleResp(resp, (data) => {
      const content = data.content ?? []
      content.forEach((node) => {
        if (me().base_path && node.parent.startsWith(me().base_path)) {
          const pattern = new RegExp("^" + me().base_path)
          node.parent = node.parent.replace(pattern, "") || "/"
          if (!node.parent.startsWith("/")) {
            node.parent = "/" + node.parent
          }
        }
        node.path = encodePath(pathJoin(node.parent, node.name))
      })
      setResults(content)
      setActive(0)
    })
  }

  createEffect(
    on(
      [keywords, scope, open],
      ([kw, sc, isOpen]) => {
        window.clearTimeout(debounceTimer)
        if (!isOpen) return
        if (!kw.trim()) {
          reqSeq++
          setResults([])
          setActive(0)
          return
        }
        debounceTimer = window.setTimeout(() => {
          runSearch(kw, sc)
        }, 250)
      },
      { defer: true },
    ),
  )

  const selectNode = (node?: SearchNode) => {
    if (!node) return
    setPathAs(node.path, node.is_dir)
    close()
    to(`${node.path}?from=search`)
  }

  const onInputKeyDown = (e: KeyboardEvent) => {
    const n = results().length
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => (n ? (i + 1) % n : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => (n ? (i - 1 + n) % n : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (n > 0) {
        selectNode(results()[active()])
      } else if (keywords().trim()) {
        window.clearTimeout(debounceTimer)
        runSearch(keywords(), scope())
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      close()
    } else if (e.key === "Tab") {
      e.preventDefault()
      const next = ((scope() + (e.shiftKey ? 2 : 1)) % 3) as ScopeIndex
      setScope(next)
    }
  }

  createEffect(() => {
    const idx = active()
    listEl
      ?.querySelector<HTMLElement>(`[data-hit-index="${idx}"]`)
      ?.scrollIntoView({ block: "nearest" })
  })

  return (
    <Show when={open()}>
      <Portal>
        <div
          class="ol-modern-scope ol-overlay ol-overlay--palette"
          data-modern-theme={colorMode() === "dark" ? "dark" : "light"}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            class="ol-palette"
            role="dialog"
            aria-modal="true"
            aria-label={t("home.search.search")}
          >
            <div class="ol-palette__input">
              <ISearch size={18} />
              <input
                ref={inputEl}
                id="search-input"
                value={keywords()}
                placeholder={t("home.search.search")}
                onInput={(e) => setKeywords(e.currentTarget.value)}
                onKeyDown={onInputKeyDown}
              />
              <button
                type="button"
                class="ol-kbd"
                style={{ cursor: "pointer", background: "transparent" }}
                onClick={close}
              >
                Esc
              </button>
            </div>

            <div class="ol-palette__scopes" role="group">
              <For each={SCOPES}>
                {(sc, idx) => (
                  <button
                    type="button"
                    class="ol-scope"
                    aria-pressed={scope() === idx()}
                    onClick={() => {
                      setScope(idx() as ScopeIndex)
                      inputEl?.focus()
                    }}
                  >
                    {t(`home.search.scopes.${sc}`)}
                  </button>
                )}
              </For>
            </div>

            <div class="ol-palette__list" role="listbox" ref={listEl}>
              <Show
                when={!loading()}
                fallback={
                  <div class="ol-empty">{t("home.search.searching")}</div>
                }
              >
                <Show
                  when={results().length > 0}
                  fallback={
                    <div class="ol-empty">{t("home.search.no_result")}</div>
                  }
                >
                  <For each={results()}>
                    {(item, i) => (
                      <a
                        class="ol-hit"
                        role="option"
                        href={joinBase(`${item.path}?from=search`)}
                        data-hit-index={i()}
                        data-active={active() === i()}
                        aria-selected={active() === i()}
                        onMouseMove={() => setActive(i())}
                        onMouseEnter={() => setPathAs(item.path, item.is_dir)}
                        onClick={(e) => {
                          if (
                            e.button === 0 &&
                            !e.ctrlKey &&
                            !e.metaKey &&
                            !e.shiftKey
                          ) {
                            e.preventDefault()
                            selectNode(item)
                          }
                        }}
                      >
                        <FileIcon
                          kind={fileKind(item.name, item.is_dir, item.type)}
                          size={20}
                        />
                        <span class="ol-hit__text">
                          <span class="ol-hit__name">
                            <For each={highlightName(item.name, keywords())}>
                              {(seg) => (seg.m ? <mark>{seg.t}</mark> : seg.t)}
                            </For>
                          </span>
                          <span class="ol-hit__path">{item.parent}</span>
                        </span>
                        <Show when={!item.is_dir && item.size > 0}>
                          <span class="ol-hit__size">
                            {getFileSize(item.size)}
                          </span>
                        </Show>
                      </a>
                    )}
                  </For>
                </Show>
              </Show>
            </div>

            <div class="ol-palette__foot">
              <span>
                <kbd class="ol-kbd">↑</kbd>
                <kbd class="ol-kbd">↓</kbd>
              </span>
              <span>
                <kbd class="ol-kbd">Enter</kbd>
              </span>
              <span>
                <kbd class="ol-kbd">Tab</kbd>
              </span>
              <span>
                <kbd class="ol-kbd">Esc</kbd>
              </span>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  )
}

export { Search }
