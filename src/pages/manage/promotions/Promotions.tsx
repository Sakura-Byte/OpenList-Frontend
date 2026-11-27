import { Button } from "@hope-ui/solid"
import { TbEdit, TbPhoto, TbPlus, TbRefresh, TbSearch } from "solid-icons/tb"
import { createMemo, createSignal, For, Show } from "solid-js"
import {
  useFetch,
  useListFetch,
  useManageTitle,
  useRouter,
  useT,
} from "~/hooks"
import { loadPublicPromotions } from "~/store"
import { PEmptyResp, Promotion, PromotionSlot, Resp } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { DeletePopover } from "../common/DeletePopover"

const SLOTS: PromotionSlot[] = [
  "popup_ad",
  "header_banner",
  "readme_sponsor",
  "ad_recruit",
  "subdir_sponsor",
]

const Promotions = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.promotions")
  const { to } = useRouter()
  const [items, setItems] = createSignal<Promotion[]>([])
  const [activeSlot, setActiveSlot] = createSignal<"all" | PromotionSlot>("all")
  const [search, setSearch] = createSignal("")

  const [loading, fetchList] = useFetch(
    (): Promise<Resp<{ content: Promotion[]; total: number } | Promotion[]>> =>
      r.get("/admin/promotion/list"),
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
    r.post(`/admin/promotion/delete?id=${id}`),
  )

  const countBySlot = (slot: PromotionSlot) =>
    items().filter((item) => (item.slot || "header_banner") === slot).length

  const filteredItems = createMemo(() => {
    const slot = activeSlot()
    const q = search().trim().toLowerCase()
    return items().filter((item) => {
      const itemSlot = item.slot || "header_banner"
      if (slot !== "all" && itemSlot !== slot) return false
      if (!q) return true
      return (
        item.title?.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        (item.path_prefix || "/").toLowerCase().includes(q) ||
        item.track_name?.toLowerCase().includes(q) ||
        item.cta_url?.toLowerCase().includes(q)
      )
    })
  })

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.sidemenu.promotions")}</h1>
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
            onClick={() => to("/@manage/promotions/add")}
          >
            <TbPlus size={15} class="ol-ico" />
            <span>{t("global.add")}</span>
          </button>
        </div>
      </div>

      <div class="ol-admin-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="ol-admin-tab"
          data-active={activeSlot() === "all"}
          aria-selected={activeSlot() === "all"}
          onClick={() => setActiveSlot("all")}
        >
          <span>{t("manage.common.all")}</span>
          <span class="ol-pill ol-tabular">{items().length}</span>
        </button>
        <For each={SLOTS}>
          {(slot) => (
            <button
              type="button"
              role="tab"
              class="ol-admin-tab"
              data-active={activeSlot() === slot}
              aria-selected={activeSlot() === slot}
              onClick={() => setActiveSlot(slot)}
            >
              <span>{t(`promotions.slots.${slot}`)}</span>
              <Show when={countBySlot(slot) > 0}>
                <span class="ol-pill ol-tabular">{countBySlot(slot)}</span>
              </Show>
            </button>
          )}
        </For>
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
                <th>{t("promotions.image")}</th>
                <th>{t("promotions.title")}</th>
                <th>{t("promotions.slot")}</th>
                <th>{t("promotions.path_prefix")}</th>
                <th>{t("promotions.close_delay_sec")}</th>
                <th>{t("promotions.freq_cap")}</th>
                <th>{t("promotions.priority")}</th>
                <th>{t("promotions.enabled")}</th>
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
                          width: "88px",
                          height: "44px",
                          display: "flex",
                          "align-items": "center",
                          "justify-content": "center",
                          background: "var(--ol-surface-2)",
                          border: "1px solid var(--ol-border)",
                          "border-radius": "var(--ol-radius-xs)",
                          overflow: "hidden",
                        }}
                      >
                        <Show
                          when={item.image?.trim()}
                          fallback={
                            <TbPhoto
                              size={16}
                              class="ol-ico"
                              style={{ color: "var(--ol-text-faint)" }}
                            />
                          }
                        >
                          <img
                            src={item.image}
                            alt={item.title || ""}
                            loading="lazy"
                            style={{
                              width: "88px",
                              "max-height": "44px",
                              "object-fit": "contain",
                              display: "block",
                            }}
                          />
                        </Show>
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          "flex-direction": "column",
                          gap: "2px",
                          "min-width": "150px",
                        }}
                      >
                        <span style={{ "font-weight": 550 }}>{item.title}</span>
                        <Show when={item.subtitle}>
                          <span
                            style={{
                              "font-size": "12px",
                              color: "var(--ol-text-muted)",
                              "max-width": "260px",
                              overflow: "hidden",
                              "text-overflow": "ellipsis",
                              "white-space": "nowrap",
                            }}
                          >
                            {item.subtitle}
                          </span>
                        </Show>
                      </div>
                    </td>
                    <td>
                      <span class="ol-pill">
                        {t(`promotions.slots.${item.slot || "header_banner"}`)}
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
                    <td class="ol-tabular">{`${item.close_delay_sec ?? 0}s`}</td>
                    <td>
                      {t(`promotions.freq_caps.${item.freq_cap || "session"}`)}
                    </td>
                    <td class="ol-tabular">{item.priority}</td>
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
                          onClick={() =>
                            to(`/@manage/promotions/edit/${item.id}`)
                          }
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
                              loadPublicPromotions()
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

export default Promotions
