import {
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
} from "@hope-ui/solid"
import { createStorageSignal } from "@solid-primitives/storage"
import {
  TbLayoutGrid,
  TbList,
  TbPlus,
  TbRefresh,
  TbReload,
  TbSearch,
  TbX,
} from "solid-icons/tb"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { EmptyResp, PageResp, Resp, Storage } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { StorageGridItem, StorageListItem, storageStatusKind } from "./Storage"

type StatusFilter = "all" | "work" | "disabled" | "error"

const Storages = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.storages")
  const { to } = useRouter()

  const [getStoragesLoading, getStorages] = useFetch(
    (): Promise<PageResp<Storage>> => r.get("/admin/storage/list"),
  )
  const [loadAllLoading, reqLoadAll] = useFetch((): Promise<EmptyResp> =>
    r.post("/admin/storage/load_all"),
  )
  const [storages, setStorages] = createSignal<Storage[]>([])
  const [drivers, setDrivers] = createSignal<string[]>([])
  const [selectedDrivers, setSelectedDrivers] = createSignal<string[]>([])
  const [search, setSearch] = createSignal("")
  const [statusFilter, setStatusFilter] = createSignal<StatusFilter>("all")

  const refresh = async () => {
    const resp = await getStorages()
    handleResp(resp, (data) => setStorages(data.content ?? []))
  }

  const getDrivers = async () => {
    const resp: Resp<string[]> = await r.get("/admin/driver/names")
    handleResp(resp, (data) => setDrivers(data ?? []))
  }

  getDrivers()
  refresh()

  const loadAll = async () => {
    const resp = await reqLoadAll()
    handleResp(resp, () => {
      notify.success(t("storages.other.start_load_success"))
      refresh()
    })
  }

  const counts = createMemo(() => {
    let work = 0
    let disabled = 0
    let error = 0
    for (const s of storages()) {
      const k = storageStatusKind(s)
      if (k === "work") work++
      else if (k === "disabled") disabled++
      else error++
    }
    return {
      all: storages().length,
      work,
      disabled,
      error,
    }
  })

  const shownStorages = createMemo(() => {
    const q = search().trim().toLowerCase()
    const sf = statusFilter()
    const drv = selectedDrivers()

    return storages().filter((storage) => {
      if (sf !== "all" && storageStatusKind(storage) !== sf) {
        return false
      }
      if (drv.length > 0 && !drv.includes(storage.driver)) {
        return false
      }
      if (q) {
        const driverLabel = t(
          `drivers.drivers.${storage.driver}`,
          undefined,
          storage.driver,
        ).toLowerCase()
        const matched =
          storage.mount_path.toLowerCase().includes(q) ||
          storage.driver.toLowerCase().includes(q) ||
          driverLabel.includes(q) ||
          (storage.remark ?? "").toLowerCase().includes(q)
        if (!matched) return false
      }
      return true
    })
  })

  const hasActiveFilter = createMemo(
    () =>
      search().trim().length > 0 ||
      statusFilter() !== "all" ||
      selectedDrivers().length > 0,
  )

  const resetFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setSelectedDrivers([])
  }

  const [layout, setLayout] = createStorageSignal(
    "storages-layout",
    "grid" as "grid" | "table",
  )

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
          label: t("manage.common.status_work"),
          count: counts().work,
          dot: "work" as const,
        },
        {
          key: "disabled" as const,
          label: t("manage.common.status_disabled"),
          count: counts().disabled,
          dot: "disabled" as const,
        },
        {
          key: "error" as const,
          label: t("manage.common.status_error"),
          count: counts().error,
          dot: "error" as const,
        },
      ] as const,
  )

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.sidemenu.storages")}</h1>
          <p class="ol-admin-subtitle ol-tabular">
            {t("manage.common.total")}: {counts().all} ·{" "}
            {t("manage.common.status_work")}: {counts().work} ·{" "}
            {t("manage.common.status_disabled")}: {counts().disabled}
            <Show when={counts().error > 0}>
              {" · "}
              {t("manage.common.status_error")}: {counts().error}
            </Show>
          </p>
        </div>

        <div class="ol-admin-head__actions">
          <button
            type="button"
            class="ol-btn"
            disabled={getStoragesLoading()}
            onClick={refresh}
          >
            <TbRefresh size={15} class="ol-ico" />
            <span>{t("global.refresh")}</span>
          </button>
          <button
            type="button"
            class="ol-btn"
            disabled={getStoragesLoading() || loadAllLoading()}
            onClick={loadAll}
          >
            <TbReload size={15} class="ol-ico" />
            <span>{t("storages.other.load_all")}</span>
          </button>
          <button
            type="button"
            class="ol-btn ol-btn--primary"
            onClick={() => to("/@manage/storages/add")}
          >
            <TbPlus size={15} class="ol-ico" />
            <span>{t("global.add")}</span>
          </button>
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

          <Show when={drivers().length > 0}>
            <div style={{ "min-width": "200px" }}>
              <Select
                multiple
                size="sm"
                value={selectedDrivers()}
                onChange={setSelectedDrivers}
              >
                <SelectTrigger>
                  <SelectPlaceholder>
                    {t("storages.other.filter_by_driver")}
                  </SelectPlaceholder>
                  <SelectValue />
                  <SelectIcon />
                </SelectTrigger>
                <SelectContent>
                  <SelectListbox>
                    <For each={drivers()}>
                      {(item) => (
                        <SelectOption value={item}>
                          <SelectOptionText>
                            {t(`drivers.drivers.${item}`, undefined, item)}
                          </SelectOptionText>
                          <SelectOptionIndicator />
                        </SelectOption>
                      )}
                    </For>
                  </SelectListbox>
                </SelectContent>
              </Select>
            </div>
          </Show>

          <Show when={hasActiveFilter()}>
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

        <div class="ol-admin-toolbar__right">
          <div class="ol-admin-toolbar__group">
            <button
              type="button"
              class="ol-icon-btn"
              data-active={layout() === "grid"}
              aria-pressed={layout() === "grid"}
              title={t("manage.common.grid_view")}
              aria-label={t("manage.common.grid_view")}
              onClick={() => setLayout("grid")}
            >
              <TbLayoutGrid size={17} class="ol-ico" />
            </button>
            <button
              type="button"
              class="ol-icon-btn"
              data-active={layout() === "table"}
              aria-pressed={layout() === "table"}
              title={t("manage.common.table_view")}
              aria-label={t("manage.common.table_view")}
              onClick={() => setLayout("table")}
            >
              <TbList size={17} class="ol-ico" />
            </button>
          </div>
        </div>
      </div>

      <Show
        when={shownStorages().length > 0}
        fallback={
          <div class="ol-admin-card">
            <div class="ol-admin-empty">
              <span>
                {storages().length === 0
                  ? t("manage.overview.no_storages")
                  : t("manage.common.no_results")}
              </span>
              <Show
                when={storages().length === 0}
                fallback={
                  <button type="button" class="ol-btn" onClick={resetFilters}>
                    <TbX size={14} class="ol-ico" />
                    <span>{t("manage.common.reset")}</span>
                  </button>
                }
              >
                <button
                  type="button"
                  class="ol-btn ol-btn--primary"
                  onClick={() => to("/@manage/storages/add")}
                >
                  <TbPlus size={15} class="ol-ico" />
                  <span>{t("global.add")}</span>
                </button>
              </Show>
            </div>
          </div>
        }
      >
        <Switch>
          <Match when={layout() === "grid"}>
            <div class="ol-admin-grid">
              <For each={shownStorages()}>
                {(storage) => (
                  <StorageGridItem storage={storage} refresh={refresh} />
                )}
              </For>
            </div>
          </Match>
          <Match when={layout() === "table"}>
            <div class="ol-admin-table-wrap">
              <table class="ol-admin-table">
                <thead>
                  <tr>
                    <For
                      each={[
                        "mount_path",
                        "driver",
                        "order",
                        "usage",
                        "status",
                        "remark",
                      ]}
                    >
                      {(title) => <th>{t(`storages.common.${title}`)}</th>}
                    </For>
                    <th>{t("global.operations")}</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={shownStorages()}>
                    {(storage) => (
                      <StorageListItem storage={storage} refresh={refresh} />
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Match>
        </Switch>
      </Show>
    </div>
  )
}

export default Storages
