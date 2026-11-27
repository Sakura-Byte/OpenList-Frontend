import { Input } from "@hope-ui/solid"
import {
  TbAlertTriangle,
  TbPlayerPause,
  TbPlayerPlay,
  TbRefresh,
} from "solid-icons/tb"
import { createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useJMTranslation } from "~/pages/home/jmcomic/i18n"
import { EmptyResp, Resp } from "~/types"
import { getFileSize, handleResp, r } from "~/utils"

interface SyncStatus {
  phase: string
  paused: boolean
  works: number
  cached: number
  pending: number
  failed: number
  current_task: string
  pages: number
  chapters: number
  last_feeds: number
  next_feeds: number
  last_sync: number
  last_full_sync: number
  next_sync: number
  next_full_sync: number
  cache_bytes: number
  last_error: string
}

export const useJMComicTranslation = useJMTranslation

export function JMComicSyncPanel(props: {
  storageId: number
  disabled: boolean
}) {
  const t = useJMComicTranslation()
  const [status, setStatus] = createSignal<SyncStatus>()
  const [error, setError] = createSignal("")
  const [busy, setBusy] = createSignal(false)
  const [workId, setWorkId] = createSignal("")
  let disposed = false
  let polling = false

  const refresh = async () => {
    if (disposed || polling || props.disabled || document.hidden) return
    polling = true
    try {
      const response: Resp<SyncStatus> = await r.get(
        `/admin/storage/jmcomic/status?id=${props.storageId}`,
      )
      if (disposed) return
      if (response.code === 200) {
        setStatus(response.data)
        setError("")
      } else {
        setError(response.message)
      }
    } catch {
      if (!disposed) setError(t("request_failed"))
    } finally {
      polling = false
    }
  }

  const action = async (name: string) => {
    if (busy()) return
    setBusy(true)
    try {
      const response: EmptyResp = await r.post(
        "/admin/storage/jmcomic/action",
        {
          id: props.storageId,
          action: name,
          work_id: name === "refresh" ? workId().trim() : undefined,
        },
      )
      if (!disposed) handleResp(response, () => void refresh())
    } catch {
      if (!disposed) setError(t("request_failed"))
    } finally {
      if (!disposed) setBusy(false)
    }
  }

  onMount(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), 3000)
    const visible = () => void refresh()
    document.addEventListener("visibilitychange", visible)
    onCleanup(() => {
      disposed = true
      clearInterval(timer)
      document.removeEventListener("visibilitychange", visible)
    })
  })

  const date = (timestamp: number) =>
    timestamp ? new Date(timestamp * 1000).toLocaleString() : t("never")

  return (
    <section class="ol-admin-card">
      <div class="ol-admin-card__head">
        <div>
          <h2 class="ol-admin-card__title">{t("title")}</h2>
          <p class="ol-admin-card__subtitle">{t("policy")}</p>
        </div>
        <Show when={status()}>
          {(s) => (
            <span class="ol-status">
              <span
                class="ol-status-dot"
                data-status={
                  s().paused ? "disabled" : s().failed > 0 ? "warn" : "work"
                }
              />
              <span>{s().paused ? t("paused") : t(s().phase)}</span>
            </span>
          )}
        </Show>
      </div>

      <div class="ol-admin-form-stack">
        <Show when={props.disabled}>
          <div
            style={{
              padding: "8px 12px",
              "border-radius": "var(--ol-radius-sm)",
              background: "var(--ol-surface-2)",
              border: "1px solid var(--ol-border)",
              color: "var(--ol-text-secondary)",
              "font-size": "13px",
            }}
          >
            {t("disabled")}
          </div>
        </Show>

        <Show when={error()}>
          <div
            role="alert"
            style={{
              display: "flex",
              "align-items": "center",
              gap: "8px",
              padding: "8px 12px",
              "border-radius": "var(--ol-radius-sm)",
              background: "var(--ol-danger-soft)",
              color: "var(--ol-danger)",
              "font-size": "13px",
            }}
          >
            <TbAlertTriangle size={15} class="ol-ico" />
            <span>{error()}</span>
          </div>
        </Show>

        <Show when={status()}>
          {(s) => (
            <>
              <Show when={s().current_task}>
                <div
                  aria-live="polite"
                  style={{
                    "font-size": "13px",
                    color: "var(--ol-text-secondary)",
                    "font-family": "var(--ol-font-mono)",
                    "overflow-wrap": "anywhere",
                  }}
                >
                  {s().current_task}
                </div>
              </Show>

              <div
                style={{
                  display: "flex",
                  "flex-wrap": "wrap",
                  gap: "8px",
                }}
              >
                <span class="ol-pill ol-tabular">
                  {t("works")}: {s().works.toLocaleString()}
                </span>
                <span class="ol-pill ol-tabular">
                  {t("cached")}: {s().cached.toLocaleString()}
                </span>
                <span class="ol-pill ol-tabular">
                  {t("pending")}: {s().pending.toLocaleString()}
                </span>
                <span class="ol-pill ol-tabular">
                  {t("chapters")}: {s().chapters.toLocaleString()}
                </span>
                <span
                  class="ol-pill ol-tabular"
                  data-tone={s().failed > 0 ? "danger" : undefined}
                >
                  {t("failed")}: {s().failed.toLocaleString()}
                </span>
                <span class="ol-pill ol-tabular">
                  {t("cache_size")}: {getFileSize(s().cache_bytes)}
                </span>
                <Show when={s().pages > 0}>
                  <span class="ol-pill ol-tabular">
                    {t("pages")}: {s().pages}
                  </span>
                </Show>
              </div>

              <div
                class="ol-tabular"
                style={{
                  display: "grid",
                  "grid-template-columns":
                    "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "6px 16px",
                  padding: "10px 12px",
                  "border-radius": "var(--ol-radius-sm)",
                  background: "var(--ol-surface-2)",
                  "font-size": "12.5px",
                  color: "var(--ol-text-secondary)",
                }}
              >
                <div>
                  {t("last_sync")}: {date(s().last_sync)}
                </div>
                <div>
                  {t("next_sync")}: {date(s().next_sync)}
                </div>
                <div>
                  {t("last_full")}: {date(s().last_full_sync)}
                </div>
                <div>
                  {t("next_full")}: {date(s().next_full_sync)}
                </div>
                <div>
                  {t("last_feeds")}: {date(s().last_feeds)}
                </div>
                <div>
                  {t("next_feeds")}: {date(s().next_feeds)}
                </div>
              </div>

              <Show when={s().last_error}>
                <div
                  style={{
                    padding: "8px 12px",
                    "border-radius": "var(--ol-radius-sm)",
                    background: "var(--ol-danger-soft)",
                    color: "var(--ol-danger)",
                    "font-size": "12.5px",
                    "overflow-wrap": "anywhere",
                  }}
                >
                  {s().last_error}
                </div>
              </Show>
            </>
          )}
        </Show>

        <div
          style={{
            display: "flex",
            "flex-wrap": "wrap",
            gap: "8px",
          }}
        >
          <button
            type="button"
            class="ol-btn"
            disabled={busy() || props.disabled || !status()}
            onClick={() => action(status()?.paused ? "resume" : "pause")}
          >
            {status()?.paused ? (
              <TbPlayerPlay size={15} class="ol-ico" />
            ) : (
              <TbPlayerPause size={15} class="ol-ico" />
            )}
            <span>{status()?.paused ? t("resume") : t("pause")}</span>
          </button>
          <For each={["incremental", "full", "feeds", "retry"] as const}>
            {(name) => (
              <button
                type="button"
                class="ol-btn"
                disabled={busy() || props.disabled}
                onClick={() => action(name)}
              >
                <TbRefresh size={15} class="ol-ico" />
                <span>{t(`${name}_action`)}</span>
              </button>
            )}
          </For>
        </div>

        <div
          style={{
            display: "flex",
            "flex-wrap": "wrap",
            "align-items": "center",
            gap: "8px",
          }}
        >
          <div style={{ flex: "1 1 220px", "max-width": "320px" }}>
            <Input
              aria-label={t("work_id")}
              placeholder={t("work_id")}
              value={workId()}
              onInput={(event) => setWorkId(event.currentTarget.value)}
            />
          </div>
          <button
            type="button"
            class="ol-btn"
            disabled={busy() || props.disabled || !workId().trim()}
            onClick={() => action("refresh")}
          >
            <TbRefresh size={15} class="ol-ico" />
            <span>{t("refresh_work")}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
