import { Button } from "@hope-ui/solid"
import { TbEdit, TbPlus, TbRefresh, TbSearch } from "solid-icons/tb"
import { createMemo, createSignal, For, Show } from "solid-js"
import {
  useFetch,
  useListFetch,
  useManageTitle,
  useRouter,
  useT,
} from "~/hooks"
import { loadPublicNotices } from "~/store"
import { Notice, PEmptyResp, Resp } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { DeletePopover } from "../common/DeletePopover"

const Notices = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.notices")
  const { to } = useRouter()
  const [items, setItems] = createSignal<Notice[]>([])
  const [search, setSearch] = createSignal("")

  const [loading, fetchList] = useFetch(
    (): Promise<Resp<{ content: Notice[]; total: number } | Notice[]>> =>
      r.get("/admin/notice/list"),
  )

  const refresh = async () => {
    const resp = await fetchList()
    handleResp(resp, (data) => {
      const list = Array.isArray(data) ? data : (data?.content ?? [])
      setItems(list)
    })
  }
  refresh()

  const [deleting, deleteItem] = useListFetch((id: number): PEmptyResp =>
    r.post(`/admin/notice/delete?id=${id}`),
  )

  const severityStatus = (
    sev: Notice["severity"],
  ): "info" | "warn" | "error" => {
    if (sev === "critical") return "error"
    if (sev === "warning") return "warn"
    return "info"
  }

  const filteredItems = createMemo(() => {
    const q = search().trim().toLowerCase()
    if (!q) return items()
    return items().filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q) ||
        (item.path_prefix || "/").toLowerCase().includes(q),
    )
  })

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.sidemenu.notices")}</h1>
        </div>
        <div class="ol-admin-head__actions">
          <button
            type="button"
            class="ol-btn"
            disabled={loading()}
            onClick={refresh}
          >
            <TbRefresh size={15} class="ol-ico" />
            <span>{t("global.refresh")}</span>
          </button>
          <button
            type="button"
            class="ol-btn ol-btn--primary"
            onClick={() => to("/@manage/notices/add")}
          >
            <TbPlus size={15} class="ol-ico" />
            <span>{t("global.add")}</span>
          </button>
        </div>
      </div>

      <div class="ol-admin-toolbar">
        <div class="ol-admin-toolbar__left">
          <div class="ol-admin-search">
            <TbSearch size={15} class="ol-ico" />
            <input
              type="search"
              placeholder={t("manage.common.search")}
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>
        </div>
        <div class="ol-admin-toolbar__right">
          <span class="ol-pill ol-tabular">
            {filteredItems().length} / {items().length}
          </span>
        </div>
      </div>

      <div class="ol-admin-table-wrap">
        <Show
          when={filteredItems().length > 0}
          fallback={
            <div class="ol-admin-empty">
              {items().length > 0
                ? t("manage.common.no_results")
                : t("manage.common.no_data")}
            </div>
          }
        >
          <table class="ol-admin-table">
            <thead>
              <tr>
                <th>{t("notices.title")}</th>
                <th>{t("notices.severity")}</th>
                <th>{t("notices.display_type")}</th>
                <th>{t("notices.path_prefix")}</th>
                <th>{t("notices.sort")}</th>
                <th>{t("notices.enabled")}</th>
                <th>{t("global.operations")}</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredItems()}>
                {(item) => (
                  <tr>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          "flex-direction": "column",
                          gap: "2px",
                          "min-width": "180px",
                        }}
                      >
                        <span style={{ "font-weight": 550 }}>{item.title}</span>
                        <Show when={item.summary}>
                          <span
                            style={{
                              "font-size": "12px",
                              color: "var(--ol-text-muted)",
                              "max-width": "380px",
                              overflow: "hidden",
                              "text-overflow": "ellipsis",
                              "white-space": "nowrap",
                            }}
                          >
                            {item.summary}
                          </span>
                        </Show>
                      </div>
                    </td>
                    <td>
                      <span class="ol-status">
                        <span
                          class="ol-status-dot"
                          data-status={severityStatus(item.severity)}
                        />
                        <span>
                          {t(`notices.severities.${item.severity || "info"}`)}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span class="ol-pill">
                        {t(
                          `notices.display_types.${item.display_type || "auto"}`,
                        )}
                      </span>
                    </td>
                    <td>
                      <code
                        style={{
                          "font-family": "var(--ol-font-mono)",
                          "font-size": "12.5px",
                          color: "var(--ol-text-secondary)",
                        }}
                      >
                        {item.path_prefix || "/"}
                      </code>
                    </td>
                    <td class="ol-tabular">{item.sort}</td>
                    <td>
                      <span class="ol-status">
                        <span
                          class="ol-status-dot"
                          data-status={item.enabled ? "work" : "disabled"}
                        />
                        <span>
                          {t(
                            item.enabled
                              ? "manage.common.enabled"
                              : "manage.common.disabled",
                          )}
                        </span>
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "inline-flex",
                          "align-items": "center",
                          gap: "6px",
                          "white-space": "nowrap",
                        }}
                      >
                        <Button
                          onClick={() => to(`/@manage/notices/edit/${item.id}`)}
                        >
                          <TbEdit
                            size={14}
                            class="ol-ico"
                            style={{ "margin-right": "4px" }}
                          />
                          {t("global.edit")}
                        </Button>
                        <DeletePopover
                          name={item.title}
                          loading={deleting() === item.id}
                          onClick={async () => {
                            const resp = await deleteItem(item.id)
                            handleResp(resp, () => {
                              notify.success(t("global.delete_success"))
                              loadPublicNotices()
                              refresh()
                            })
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>
    </div>
  )
}

export default Notices
