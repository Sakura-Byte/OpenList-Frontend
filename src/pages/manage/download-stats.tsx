import {
  TbArrowDown,
  TbDatabase,
  TbDownload,
  TbExternalLink,
  TbRefresh,
  TbSearch,
  TbUsers,
} from "solid-icons/tb"
import { createMemo, createSignal, For, JSX, Show } from "solid-js"
import { FullLoading } from "~/components"
import { useFetch, useManageTitle, useT } from "~/hooks"
import { PResp } from "~/types"
import { encodePath, getFileSize, handleResp, joinBase, r } from "~/utils"

type AuthorStat = {
  author: string
  count: number
  bytes: number
}

type SortKey = "count" | "bytes"

const AREA = "/3D"
const DAY_OPTIONS = [1, 7, 30, 90]
const LIMIT_OPTIONS = [50, 100, 500]

const SegmentedChoice = <T extends number>(props: {
  options: T[]
  value: T
  label: (option: T) => string
  onChange: (option: T) => void
}) => (
  <div
    role="group"
    style={{
      display: "inline-flex",
      "align-items": "center",
      gap: "2px",
      padding: "2px",
      background: "var(--ol-surface-2)",
      border: "1px solid var(--ol-border)",
      "border-radius": "var(--ol-radius-sm)",
    }}
  >
    <For each={props.options}>
      {(option) => {
        const active = () => props.value === option
        return (
          <button
            type="button"
            aria-pressed={active()}
            onClick={() => props.onChange(option)}
            class="ol-tabular"
            style={{
              height: "28px",
              padding: "0 10px",
              border: "0",
              "border-radius": "var(--ol-radius-xs)",
              background: active() ? "var(--ol-surface-card)" : "transparent",
              color: active()
                ? "var(--ol-accent-text)"
                : "var(--ol-text-secondary)",
              "font-family": "var(--ol-font)",
              "font-size": "12.5px",
              "font-weight": active() ? 600 : 500,
              cursor: "pointer",
              "box-shadow": active() ? "var(--ol-shadow-xs)" : "none",
              transition: "background-color 0.12s ease, color 0.12s ease",
            }}
          >
            {props.label(option)}
          </button>
        )
      }}
    </For>
  </div>
)

const SortHeader = (props: {
  active: boolean
  onClick: () => void
  children: JSX.Element
}) => (
  <th
    aria-sort={props.active ? "descending" : "none"}
    style={{ cursor: "pointer", "user-select": "none" }}
    onClick={props.onClick}
  >
    <span
      style={{
        display: "inline-flex",
        "align-items": "center",
        gap: "4px",
        color: props.active ? "var(--ol-accent-text)" : "inherit",
      }}
    >
      <span>{props.children}</span>
      <Show when={props.active}>
        <TbArrowDown size={14} class="ol-ico" />
      </Show>
    </span>
  </th>
)

const DownloadStats = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.download_stats")
  const [days, setDays] = createSignal(7)
  const [limit, setLimit] = createSignal(50)
  const [sortKey, setSortKey] = createSignal<SortKey>("count")
  const [search, setSearch] = createSignal("")
  const [rows, setRows] = createSignal<AuthorStat[]>([])
  const [loaded, setLoaded] = createSignal(false)
  const [loading, getStats] = useFetch((): PResp<AuthorStat[]> =>
    r.get("/admin/gd_download/top", {
      params: { prefix: AREA, days: days(), limit: limit() },
    }),
  )
  const refresh = async () => {
    const resp = await getStats()
    handleResp(resp, (data) => {
      setRows(data ?? [])
      setLoaded(true)
    })
  }
  refresh()

  const totalCount = createMemo(() =>
    rows().reduce((sum, row) => sum + row.count, 0),
  )
  const totalBytes = createMemo(() =>
    rows().reduce((sum, row) => sum + row.bytes, 0),
  )
  const sorted = createMemo(() => {
    const key = sortKey()
    return [...rows()].sort((a, b) => b[key] - a[key])
  })
  const barMax = createMemo(() =>
    Math.max(1, ...rows().map((row) => row[sortKey()])),
  )
  // rank stays the position in the full list while searching
  const visible = createMemo(() => {
    const keyword = search().trim().toLowerCase()
    return sorted()
      .map((row, index) => ({ row, rank: index + 1 }))
      .filter(({ row }) => row.author.toLowerCase().includes(keyword))
  })
  const share = (row: AuthorStat) => {
    const total = sortKey() === "count" ? totalCount() : totalBytes()
    return total > 0 ? `${((row[sortKey()] / total) * 100).toFixed(1)}%` : "0%"
  }

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.download_stats.title")}</h1>
          <p class="ol-admin-subtitle">
            {t("manage.download_stats.description")}
          </p>
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
        </div>
      </div>

      <div class="ol-admin-stat-grid">
        <div class="ol-admin-stat">
          <div class="ol-admin-stat__head">
            <span>{t("manage.download_stats.authors")}</span>
            <TbUsers size={17} class="ol-ico" />
          </div>
          <div class="ol-admin-stat__value ol-tabular">
            {rows().length.toLocaleString()}
          </div>
        </div>

        <div class="ol-admin-stat">
          <div class="ol-admin-stat__head">
            <span>{t("manage.download_stats.downloads")}</span>
            <TbDownload size={17} class="ol-ico" />
          </div>
          <div class="ol-admin-stat__value ol-tabular">
            {totalCount().toLocaleString()}
          </div>
        </div>

        <div class="ol-admin-stat">
          <div class="ol-admin-stat__head">
            <span>{t("manage.download_stats.estimated")}</span>
            <TbDatabase size={17} class="ol-ico" />
          </div>
          <div class="ol-admin-stat__value ol-tabular">
            {getFileSize(totalBytes())}
          </div>
        </div>
      </div>

      <div class="ol-admin-toolbar">
        <div class="ol-admin-toolbar__left">
          <SegmentedChoice
            options={DAY_OPTIONS}
            value={days()}
            label={(day) => t("manage.download_stats.days", { days: day })}
            onChange={(day) => {
              setDays(day)
              refresh()
            }}
          />
          <SegmentedChoice
            options={LIMIT_OPTIONS}
            value={limit()}
            label={(count) => t("manage.download_stats.top", { count: count })}
            onChange={(count) => {
              setLimit(count)
              refresh()
            }}
          />
        </div>
        <div class="ol-admin-toolbar__right">
          <div class="ol-admin-search">
            <TbSearch size={15} class="ol-ico" />
            <input
              type="search"
              placeholder={t("manage.download_stats.search")}
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>
        </div>
      </div>

      <Show when={loaded()} fallback={<FullLoading />}>
        <div class="ol-admin-table-wrap">
          <Show
            when={visible().length > 0}
            fallback={
              <div class="ol-admin-empty">
                {rows().length > 0
                  ? t("manage.download_stats.no_match")
                  : t("manage.download_stats.empty")}
              </div>
            }
          >
            <table class="ol-admin-table">
              <thead>
                <tr>
                  <th class="ol-tabular" style={{ width: "56px" }}>
                    #
                  </th>
                  <th>{t("manage.download_stats.author")}</th>
                  <SortHeader
                    active={sortKey() === "count"}
                    onClick={() => setSortKey("count")}
                  >
                    {t("manage.download_stats.downloads")}
                  </SortHeader>
                  <SortHeader
                    active={sortKey() === "bytes"}
                    onClick={() => setSortKey("bytes")}
                  >
                    {t("manage.download_stats.estimated")}
                  </SortHeader>
                  <th style={{ "min-width": "180px" }}>
                    {t("manage.download_stats.share")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={visible()}>
                  {({ row, rank }) => (
                    <tr>
                      <td
                        class="ol-tabular"
                        style={{ color: "var(--ol-text-muted)" }}
                      >
                        {rank}
                      </td>
                      <td
                        style={{
                          "min-width": "180px",
                          "overflow-wrap": "anywhere",
                        }}
                      >
                        <a
                          href={joinBase(
                            encodePath(`${AREA}/${row.author}`, true),
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            "align-items": "center",
                            gap: "5px",
                            color: "var(--ol-text-primary)",
                            "font-weight": 500,
                            "text-decoration": "none",
                          }}
                        >
                          <span>{row.author}</span>
                          <TbExternalLink
                            size={13}
                            class="ol-ico"
                            style={{
                              color: "var(--ol-text-muted)",
                              "flex-shrink": 0,
                            }}
                          />
                        </a>
                      </td>
                      <td class="ol-tabular">{row.count.toLocaleString()}</td>
                      <td
                        class="ol-tabular"
                        style={{ "white-space": "nowrap" }}
                      >
                        {getFileSize(row.bytes)}
                      </td>
                      <td>
                        <div
                          title={share(row)}
                          style={{
                            display: "flex",
                            "align-items": "center",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: "6px",
                              "min-width": "72px",
                              "border-radius": "999px",
                              background: "var(--ol-surface-2)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${(row[sortKey()] / barMax()) * 100}%`,
                                "border-radius": "999px",
                                background: "var(--ol-accent)",
                              }}
                            />
                          </div>
                          <span
                            class="ol-tabular"
                            style={{
                              "font-size": "12.5px",
                              color: "var(--ol-text-secondary)",
                              "min-width": "42px",
                              "text-align": "right",
                            }}
                          >
                            {share(row)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </div>
      </Show>
    </div>
  )
}

export default DownloadStats
