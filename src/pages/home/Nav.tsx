import { Link } from "@solidjs/router"
import { For, Show, createMemo } from "solid-js"
import { usePath, useRouter, useT, useUtil } from "~/hooks"
import { State, objStore } from "~/store"
import { encodePath, getFileSize, joinBase } from "~/utils"

export const Nav = () => {
  const { pathname, isShare, searchParams } = useRouter()
  const { isHide } = useUtil()
  const t = useT()
  const { setPathAs } = usePath()

  const paths = createMemo(() => {
    if (!isShare()) {
      return ["", ...pathname().split("/").filter(Boolean)]
    }
    const p = pathname().split("/").filter(Boolean)
    return [`@s/${p[1] ?? ""}`, ...p.slice(2)]
  })

  const visibleObjs = createMemo(() =>
    objStore.objs.filter((item) => !isHide(item)),
  )

  const totalSize = createMemo(() =>
    visibleObjs().reduce((sum, it) => sum + (it.is_dir ? 0 : it.size || 0), 0),
  )

  const showFolderStats = createMemo(
    () =>
      [State.Folder, State.FetchingMore].includes(objStore.state) &&
      !(objStore.reader && searchParams["view"] !== "files"),
  )

  return (
    <nav class="ol-crumbs nav" aria-label={t("home.nav_aria")}>
      <div class="ol-crumbs__path">
        <For each={paths()}>
          {(name, i) => {
            const isLast = createMemo(() => i() === paths().length - 1)
            const path = paths()
              .slice(0, i() + 1)
              .join("/")
            const href = encodePath(path)
            const label = createMemo(() => {
              if (!isShare() && name === "") {
                return t("manage.sidemenu.home")
              }
              if (isShare() && i() === 0) {
                return t("manage.sidemenu.shares")
              }
              return name
            })
            return (
              <span
                class="nav-item"
                style={{
                  display: "inline-flex",
                  "align-items": "center",
                  gap: "2px",
                }}
              >
                <Show when={i() > 0}>
                  <span class="ol-crumb-sep nav-separator">/</span>
                </Show>
                <Show
                  when={!isLast()}
                  fallback={
                    <span
                      class="ol-crumb nav-link"
                      aria-current="page"
                      title={label()}
                    >
                      {label()}
                    </span>
                  }
                >
                  <Link
                    class="ol-crumb nav-link"
                    href={joinBase(href)}
                    title={label()}
                    onMouseEnter={() => setPathAs(path)}
                  >
                    {label()}
                  </Link>
                </Show>
              </span>
            )
          }}
        </For>
      </div>
      <Show when={showFolderStats()}>
        <span class="ol-crumbs__meta ol-tabular">
          {t("home.crumbs_count", { count: String(visibleObjs().length) })}
          <Show when={totalSize() > 0}> · {getFileSize(totalSize())}</Show>
        </span>
      </Show>
    </nav>
  )
}
