import { Link } from "@solidjs/router"
import {
  TbArrowRight,
  TbDatabase,
  TbDatabaseExport,
  TbLayoutCards,
  TbListDetails,
  TbPalette,
  TbPlus,
  TbRefresh,
  TbSettings,
  TbSpeakerphone,
  TbUsers,
} from "solid-icons/tb"
import { createMemo, createSignal, For, onMount, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { useManageTitle, useT } from "~/hooks"
import {
  Meta,
  Notice,
  PageResp,
  Promotion,
  PublicNoticesData,
  Resp,
  Storage,
  User,
} from "~/types"
import { joinBase, r } from "~/utils"
import { getBackendKind } from "~/utils/backend"

const Dashboard = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.overview")

  const isGoBackend = () => getBackendKind() === "go"

  const [loading, setLoading] = createSignal(true)
  const [storages, setStorages] = createSignal<Storage[]>([])
  const [storagesTotal, setStoragesTotal] = createSignal(0)
  const [metasTotal, setMetasTotal] = createSignal(0)
  const [usersTotal, setUsersTotal] = createSignal(0)
  const [enabledUsersCount, setEnabledUsersCount] = createSignal(0)
  const [activeNoticesCount, setActiveNoticesCount] = createSignal(0)
  const [activePromosCount, setActivePromosCount] = createSignal(0)

  const refresh = async () => {
    setLoading(true)
    try {
      const go = isGoBackend()
      const [storageRes, metaRes, userRes, noticesRes, promosRes] =
        await Promise.all([
          r
            .get("/admin/storage/list")
            .catch(() => null) as Promise<PageResp<Storage> | null>,
          r
            .get("/admin/meta/list")
            .catch(() => null) as Promise<PageResp<Meta> | null>,
          r
            .get("/admin/user/list")
            .catch(() => null) as Promise<PageResp<User> | null>,
          go
            ? (r.get("/public/notices").catch(() => null) as Promise<Resp<
                PublicNoticesData | Notice[]
              > | null>)
            : Promise.resolve(null),
          go
            ? (r.get("/public/promotions").catch(() => null) as Promise<Resp<
                Promotion[] | { content: Promotion[] }
              > | null>)
            : Promise.resolve(null),
        ])

      if (storageRes?.code === 200 && storageRes.data) {
        const list = storageRes.data.content ?? []
        setStorages(list)
        setStoragesTotal(storageRes.data.total ?? list.length)
      }

      if (metaRes?.code === 200 && metaRes.data) {
        const list = metaRes.data.content ?? []
        setMetasTotal(metaRes.data.total ?? list.length)
      }

      if (userRes?.code === 200 && userRes.data) {
        const list = userRes.data.content ?? []
        setUsersTotal(userRes.data.total ?? list.length)
        setEnabledUsersCount(list.filter((u) => !u.disabled).length)
      }

      if (noticesRes?.code === 200 && noticesRes.data) {
        const active = Array.isArray(noticesRes.data)
          ? noticesRes.data
          : (noticesRes.data.active ?? [])
        setActiveNoticesCount(active.filter((n) => n.enabled !== false).length)
      }

      if (promosRes?.code === 200 && promosRes.data) {
        const list = Array.isArray(promosRes.data)
          ? promosRes.data
          : (promosRes.data.content ?? [])
        setActivePromosCount(list.filter((p) => p.enabled !== false).length)
      }
    } finally {
      setLoading(false)
    }
  }

  onMount(() => {
    refresh()
  })

  const enabledStoragesCount = createMemo(
    () => storages().filter((s) => !s.disabled).length,
  )

  const healthyStoragesCount = createMemo(
    () => storages().filter((s) => !s.disabled && s.status === "work").length,
  )

  const errorStoragesCount = createMemo(
    () => storages().filter((s) => !s.disabled && s.status !== "work").length,
  )

  const recentStorages = createMemo(() => {
    const list = [...storages()]
    list.sort((a, b) => {
      const aErr = !a.disabled && a.status !== "work" ? 0 : a.disabled ? 2 : 1
      const bErr = !b.disabled && b.status !== "work" ? 0 : b.disabled ? 2 : 1
      if (aErr !== bErr) return aErr - bErr
      return a.order - b.order || a.id - b.id
    })
    return list.slice(0, 8)
  })

  const storageStatusKind = (s: Storage): "work" | "disabled" | "error" => {
    if (s.disabled) return "disabled"
    return s.status === "work" ? "work" : "error"
  }

  const storageStatusText = (s: Storage): string => {
    if (s.disabled) return t("manage.common.status_disabled")
    if (s.status === "work") return t("manage.common.status_work")
    return t(
      `storages.table_fields.status.${s.status}`,
      undefined,
      s.status || t("manage.common.status_error"),
    )
  }

  const quickActions = createMemo(() => {
    const items = [
      {
        title: t("manage.overview.action_add_storage"),
        to: "/@manage/storages/add",
        icon: TbDatabase,
      },
      {
        title: t("manage.overview.action_add_meta"),
        to: "/@manage/metas/add",
        icon: TbListDetails,
      },
      {
        title: t("manage.overview.action_site_settings"),
        to: "/@manage/settings/site",
        icon: TbSettings,
      },
      {
        title: t("manage.overview.action_style_settings"),
        to: "/@manage/settings/style",
        icon: TbPalette,
      },
    ]
    if (isGoBackend()) {
      items.push(
        {
          title: t("manage.sidemenu.notices"),
          to: "/@manage/notices",
          icon: TbSpeakerphone,
        },
        {
          title: t("manage.sidemenu.promotions"),
          to: "/@manage/promotions",
          icon: TbLayoutCards,
        },
      )
    }
    items.push(
      {
        title: t("manage.sidemenu.users"),
        to: "/@manage/users",
        icon: TbUsers,
      },
      {
        title: t("manage.sidemenu.backup-restore"),
        to: "/@manage/backup-restore",
        icon: TbDatabaseExport,
      },
    )
    return items
  })

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.overview.title")}</h1>
          <p class="ol-admin-subtitle">{t("manage.overview.subtitle")}</p>
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
          <Link
            class="ol-btn ol-btn--primary"
            href={joinBase("/@manage/storages/add")}
          >
            <TbPlus size={15} class="ol-ico" />
            <span>{t("manage.overview.action_add_storage")}</span>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div class="ol-admin-stat-grid">
        <Link class="ol-admin-stat" href={joinBase("/@manage/storages")}>
          <div class="ol-admin-stat__head">
            <span>{t("manage.overview.metric_storages")}</span>
            <TbDatabase size={17} class="ol-ico" />
          </div>
          <div class="ol-admin-stat__value ol-tabular">
            {loading() ? "—" : `${enabledStoragesCount()} / ${storagesTotal()}`}
          </div>
          <div class="ol-admin-stat__sub">
            <span class="ol-status">
              <span class="ol-status-dot" data-status="work" />
              <span class="ol-tabular">
                {healthyStoragesCount()} {t("manage.common.status_work")}
              </span>
            </span>
            <Show when={errorStoragesCount() > 0}>
              <span class="ol-status">
                <span class="ol-status-dot" data-status="error" />
                <span class="ol-tabular">
                  {errorStoragesCount()} {t("manage.common.status_error")}
                </span>
              </span>
            </Show>
          </div>
        </Link>

        <Link class="ol-admin-stat" href={joinBase("/@manage/metas")}>
          <div class="ol-admin-stat__head">
            <span>{t("manage.overview.metric_metas")}</span>
            <TbListDetails size={17} class="ol-ico" />
          </div>
          <div class="ol-admin-stat__value ol-tabular">
            {loading() ? "—" : metasTotal()}
          </div>
          <div class="ol-admin-stat__sub">
            <span>{t("manage.overview.metric_metas_sub")}</span>
          </div>
        </Link>

        <Link class="ol-admin-stat" href={joinBase("/@manage/users")}>
          <div class="ol-admin-stat__head">
            <span>{t("manage.overview.metric_users")}</span>
            <TbUsers size={17} class="ol-ico" />
          </div>
          <div class="ol-admin-stat__value ol-tabular">
            {loading() ? "—" : usersTotal()}
          </div>
          <div class="ol-admin-stat__sub">
            <span class="ol-tabular">
              {enabledUsersCount()} {t("manage.common.enabled")}
            </span>
          </div>
        </Link>

        <Link
          class="ol-admin-stat"
          href={joinBase(
            isGoBackend() ? "/@manage/notices" : "/@manage/settings/site",
          )}
        >
          <div class="ol-admin-stat__head">
            <span>{t("manage.overview.metric_channels")}</span>
            <TbSpeakerphone size={17} class="ol-ico" />
          </div>
          <div class="ol-admin-stat__value ol-tabular">
            {loading() || !isGoBackend()
              ? "—"
              : `${activeNoticesCount()} / ${activePromosCount()}`}
          </div>
          <div class="ol-admin-stat__sub">
            <span>{t("manage.overview.metric_channels_sub")}</span>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <section class="ol-admin-card">
        <div class="ol-admin-card__head">
          <div>
            <h2 class="ol-admin-card__title">
              {t("manage.overview.quick_actions")}
            </h2>
          </div>
        </div>
        <div class="ol-admin-quick-grid">
          <For each={quickActions()}>
            {(item) => (
              <Link class="ol-admin-quick-link" href={joinBase(item.to)}>
                <span class="ol-admin-quick-link__icon">
                  <Dynamic component={item.icon} size={17} class="ol-ico" />
                </span>
                <span class="ol-admin-quick-link__text">{item.title}</span>
                <TbArrowRight
                  size={15}
                  class="ol-ico ol-admin-quick-link__arrow"
                />
              </Link>
            )}
          </For>
        </div>
      </section>

      {/* Recent Storages Health */}
      <section class="ol-admin-card ol-admin-card--flush">
        <div class="ol-admin-card__head">
          <div>
            <h2 class="ol-admin-card__title">
              {t("manage.overview.storage_health")}
            </h2>
            <p class="ol-admin-card__subtitle">
              {t("manage.overview.storage_health_sub")}
            </p>
          </div>
          <Link
            class="ol-btn ol-btn--ghost"
            href={joinBase("/@manage/storages")}
          >
            <span>{t("manage.overview.view_all_storages")}</span>
            <TbArrowRight size={15} class="ol-ico" />
          </Link>
        </div>

        <Show
          when={recentStorages().length > 0}
          fallback={
            <div class="ol-admin-empty">
              <span>{t("manage.overview.no_storages")}</span>
              <Link
                class="ol-btn ol-btn--primary"
                href={joinBase("/@manage/storages/add")}
              >
                <TbPlus size={15} class="ol-ico" />
                <span>{t("manage.overview.action_add_storage")}</span>
              </Link>
            </div>
          }
        >
          <div class="ol-admin-list">
            <For each={recentStorages()}>
              {(s) => (
                <Link
                  class="ol-admin-list__row"
                  href={joinBase("/@manage/storages")}
                >
                  <div class="ol-admin-list__main">
                    <span
                      class="ol-status-dot"
                      data-status={storageStatusKind(s)}
                    />
                    <span class="ol-admin-list__path">{s.mount_path}</span>
                  </div>
                  <div class="ol-admin-list__meta">
                    <span class="ol-pill">
                      {t(`drivers.drivers.${s.driver}`, undefined, s.driver)}
                    </span>
                    <span class="ol-status">{storageStatusText(s)}</span>
                  </div>
                </Link>
              )}
            </For>
          </div>
        </Show>
      </section>
    </div>
  )
}

export default Dashboard
