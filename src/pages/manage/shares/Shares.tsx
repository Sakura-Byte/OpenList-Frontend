import { Tooltip } from "@hope-ui/solid"
import { TbPlus, TbRefresh, TbSearch, TbX } from "solid-icons/tb"
import { createMemo, createSignal, For, Show } from "solid-js"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { me } from "~/store"
import { PageResp, ShareInfo, UserMethods, UserPermissions } from "~/types"
import { handleResp, r } from "~/utils"
import { getShareStatus, ShareListItem, ShareStatusKind } from "./Share"

type FilterStatus = "all" | ShareStatusKind

const Shares = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.shares")
  const { to } = useRouter()

  const [getSharesLoading, getShares] = useFetch(
    (): Promise<PageResp<ShareInfo>> => r.get("/share/list"),
  )
  const [shares, setShares] = createSignal<ShareInfo[]>([])
  const [search, setSearch] = createSignal("")
  const [statusFilter, setStatusFilter] = createSignal<FilterStatus>("all")

  const refresh = async () => {
    const resp = await getShares()
    handleResp(resp, (data) => setShares(data.content ?? []))
  }

  const canShare = UserMethods.can(
    me(),
    UserPermissions.findIndex((item) => item === "share"),
  )

  refresh()

  const counts = createMemo(() => {
    let work = 0
    let disabled = 0
    let invalid = 0
    let denied = 0
    for (const s of shares()) {
      const st = getShareStatus(s, canShare)
      if (st === "work") work++
      else if (st === "disabled") disabled++
      else if (st === "invalid") invalid++
      else denied++
    }
    return {
      all: shares().length,
      work,
      disabled,
      invalid,
      denied,
    }
  })

  const shownShares = createMemo(() => {
    const q = search().trim().toLowerCase()
    const sf = statusFilter()
    return shares().filter((s) => {
      if (sf !== "all" && getShareStatus(s, canShare) !== sf) {
        return false
      }
      if (q) {
        const matched =
          s.id.toLowerCase().includes(q) ||
          s.files.some((f) => f.toLowerCase().includes(q)) ||
          (s.creator ?? "").toLowerCase().includes(q) ||
          (s.remark ?? "").toLowerCase().includes(q)
        if (!matched) return false
      }
      return true
    })
  })

  const hasFilter = createMemo(
    () => search().trim().length > 0 || statusFilter() !== "all",
  )

  const resetFilters = () => {
    setSearch("")
    setStatusFilter("all")
  }

  const statusTabs = createMemo(
    () =>
      [
        {
          key: "all" as const,
          label: t("manage.common.all"),
          count: counts().all,
          dot: undefined,
        },
        {
          key: "work" as const,
          label: t("shares.status_list.work"),
          count: counts().work,
          dot: "work" as const,
        },
        {
          key: "disabled" as const,
          label: t("shares.status_list.disabled"),
          count: counts().disabled,
          dot: "disabled" as const,
        },
        {
          key: "invalid" as const,
          label: t("shares.status_list.invalid"),
          count: counts().invalid,
          dot: "warn" as const,
        },
      ] as const,
  )

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.sidemenu.shares")}</h1>
          <p class="ol-admin-subtitle ol-tabular">
            {t("manage.common.total")}: {counts().all} ·{" "}
            {t("shares.status_list.work")}: {counts().work} ·{" "}
            {t("shares.status_list.disabled")}: {counts().disabled}
          </p>
        </div>

        <div class="ol-admin-head__actions">
          <button
            type="button"
            class="ol-btn"
            disabled={getSharesLoading()}
            onClick={refresh}
          >
            <TbRefresh size={15} class="ol-ico" />
            <span>{t("global.refresh")}</span>
          </button>

          <Show
            when={!canShare}
            fallback={
              <button
                type="button"
                class="ol-btn ol-btn--primary"
                onClick={() => to("/@manage/shares/add")}
              >
                <TbPlus size={15} class="ol-ico" />
                <span>{t("global.add")}</span>
              </button>
            }
          >
            <Tooltip
              withArrow
              label={t("shares.no_permission_tip")}
              placement="bottom-end"
            >
              <button type="button" class="ol-btn ol-btn--primary" disabled>
                <TbPlus size={15} class="ol-ico" />
                <span>{t("global.add")}</span>
              </button>
            </Tooltip>
          </Show>
        </div>
      </div>

      <div class="ol-admin-tabs" role="tablist">
        <For each={statusTabs()}>
          {(tab) => (
            <button
              type="button"
              role="tab"
              class="ol-admin-tab"
              aria-selected={statusFilter() === tab.key}
              data-active={statusFilter() === tab.key}
              onClick={() => setStatusFilter(tab.key)}
            >
              <Show when={tab.dot}>
                {(dot) => <span class="ol-status-dot" data-status={dot()} />}
              </Show>
              <span>{tab.label}</span>
              <span class="ol-pill ol-tabular">{tab.count}</span>
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
              value={search()}
              placeholder={t("manage.common.search")}
              aria-label={t("manage.common.search")}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>

          <Show when={hasFilter()}>
            <button
              type="button"
              class="ol-btn ol-btn--ghost"
              onClick={resetFilters}
            >
              <TbX size={14} class="ol-ico" />
              <span>{t("manage.common.reset")}</span>
            </button>
          </Show>
        </div>
      </div>

      <Show
        when={shownShares().length > 0}
        fallback={
          <div class="ol-admin-card">
            <div class="ol-admin-empty">
              <span>
                {shares().length === 0
                  ? t("manage.common.no_data")
                  : t("manage.common.no_results")}
              </span>
              <Show when={hasFilter()}>
                <button type="button" class="ol-btn" onClick={resetFilters}>
                  <TbX size={14} class="ol-ico" />
                  <span>{t("manage.common.reset")}</span>
                </button>
              </Show>
            </div>
          </div>
        }
      >
        <div class="ol-admin-table-wrap">
          <table class="ol-admin-table">
            <thead>
              <tr>
                <For each={["files", "id"]}>
                  {(title) => <th>{t(`shares.${title}`)}</th>}
                </For>
                <Show when={UserMethods.is_admin(me())}>
                  <th>{t("shares.creator")}</th>
                </Show>
                <For each={["expires", "accessed", "status", "remark"]}>
                  {(title) => <th>{t(`shares.${title}`)}</th>}
                </For>
                <th>{t("global.operations")}</th>
              </tr>
            </thead>
            <tbody>
              <For each={shownShares()}>
                {(share) => (
                  <ShareListItem
                    share={share}
                    refresh={refresh}
                    canShare={canShare}
                  />
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  )
}

export default Shares
