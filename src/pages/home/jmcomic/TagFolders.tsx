import { For, Show, createMemo, createSignal } from "solid-js"
import { LinkWithBase } from "~/components"
import { ISearch } from "~/components/icons-tb"
import { useRouter } from "~/hooks"
import { objStore } from "~/store"
import { encodePath, pathJoin } from "~/utils"
import { useJMTranslation } from "./i18n"
import "./work-page.css"

export default function TagFolders() {
  const t = useJMTranslation()
  const { pathname } = useRouter()
  const [filter, setFilter] = createSignal("")

  const tags = createMemo(() => {
    const q = filter().trim().toLowerCase()
    const sorted = [...objStore.objs].sort(
      (a, b) =>
        (b.tag?.count ?? 0) - (a.tag?.count ?? 0) ||
        a.name.localeCompare(b.name),
    )
    if (!q) return sorted
    return sorted.filter((obj) => {
      const label = (obj.tag?.name ?? obj.name).toLowerCase()
      return label.includes(q)
    })
  })

  return (
    <div class="jm-tag-dir">
      <div class="jm-tag-toolbar">
        <span class="jm-tag-policy">{t("tag_count_policy")}</span>
        <div class="jm-tag-filter">
          <ISearch size={14} />
          <input
            value={filter()}
            placeholder={t("filter_tags")}
            aria-label={t("filter_tags")}
            onInput={(e) => setFilter(e.currentTarget.value)}
          />
        </div>
      </div>

      <Show
        when={tags().length > 0}
        fallback={<div class="ol-empty">{t("no_matching_tags")}</div>}
      >
        <div class="jm-tag-folders ol-nav-body">
          <For each={tags()}>
            {(obj) => (
              <LinkWithBase
                class="jm-tag-folder"
                href={encodePath(pathJoin(pathname(), obj.name), true)}
              >
                <span class="jm-tag-folder__name">
                  {obj.tag?.name ?? obj.name}
                </span>
                <span class="jm-tag-count">{obj.tag?.count ?? 0}</span>
              </LinkWithBase>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
