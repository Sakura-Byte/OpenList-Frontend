import { FormControl, FormLabel, Input } from "@hope-ui/solid"
import { TbPlayerPlay, TbPlayerStop, TbRefresh } from "solid-icons/tb"
import { createSignal, onCleanup, Show } from "solid-js"
import { FolderChooseInput } from "~/components"
import { useFetch, useT } from "~/hooks"
import { PEmptyResp, PResp } from "~/types"
import { handleResp, handleRespWithNotifySuccess, r } from "~/utils"
import { IndexFileIcon } from "./icons"

type Progress = {
  obj_count: number
  is_done: boolean
}

const Scan = () => {
  const t = useT()
  const [progress, setProgress] = createSignal<Progress>()
  const [progressLoading, getProgressReq] = useFetch((): PResp<Progress> =>
    r.get("/admin/scan/progress"),
  )
  const [refreshTimeout, setRefreshTimeout] = createSignal<number | undefined>()

  const resetRefreshTimeout = (run: boolean) => {
    if (refreshTimeout()) {
      clearTimeout(refreshTimeout())
    }
    if (run) {
      setRefreshTimeout(window.setTimeout(refreshProgress, 5000))
    } else {
      setRefreshTimeout(undefined)
    }
  }

  onCleanup(() => {
    if (refreshTimeout()) {
      clearTimeout(refreshTimeout())
    }
  })

  const refreshProgress = async () => {
    const resp = await getProgressReq()
    handleResp(
      resp,
      (data) => {
        setProgress(data)
        resetRefreshTimeout(!data.is_done)
      },
      () => {
        resetRefreshTimeout(true)
      },
    )
  }
  refreshProgress()

  const [stopLoading, stopReq] = useFetch((): PEmptyResp =>
    r.post("/admin/scan/stop"),
  )
  const stop = async () => {
    const resp = await stopReq()
    handleRespWithNotifySuccess(resp)
    refreshProgress()
  }

  const [scanPath, setScanPath] = createSignal<string>("/")
  const [rateLimit, setRateLimit] = createSignal<number>(0.0)
  const [startLoading, startReq] = useFetch((): PEmptyResp =>
    r.post("/admin/scan/start", { path: scanPath(), limit: rateLimit() }),
  )
  const start = async () => {
    const resp = await startReq()
    handleRespWithNotifySuccess(resp)
    refreshProgress()
  }

  return (
    <section class="ol-admin-card">
      <div class="ol-admin-card__head">
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <IndexFileIcon size={18} />
          <h2 class="ol-admin-card__title">{t("indexes.scan_header")}</h2>
        </div>

        <Show when={progress()}>
          {(p) => (
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "flex-wrap": "wrap",
                gap: "10px",
              }}
            >
              <span class="ol-status">
                <span
                  class="ol-status-dot"
                  data-status={p().is_done ? "disabled" : "work"}
                />
                <span>
                  {t("indexes.task_status")}:{" "}
                  {p().is_done ? t("indexes.idle") : t("indexes.running")}
                </span>
              </span>
              <span class="ol-pill ol-tabular">
                {t("indexes.obj_count")}: {p().obj_count.toLocaleString()}
              </span>
            </div>
          )}
        </Show>
      </div>

      <div class="ol-admin-form-stack">
        <div class="ol-admin-form-grid">
          <FormControl w="$full" display="flex" flexDirection="column">
            <FormLabel display="flex" alignItems="center">
              {t("indexes.path_to_scan")}
            </FormLabel>
            <FolderChooseInput
              value={scanPath()}
              onChange={(path) => setScanPath(path)}
            />
          </FormControl>

          <FormControl w="$full" display="flex" flexDirection="column">
            <FormLabel display="flex" alignItems="center">
              {t("indexes.rate_limit")}
            </FormLabel>
            <Input
              type="number"
              value={rateLimit()}
              step={0.1}
              onInput={(e) =>
                setRateLimit(parseFloat(e.currentTarget.value) || 0)
              }
            />
          </FormControl>
        </div>

        <div
          style={{
            display: "flex",
            "align-items": "center",
            "flex-wrap": "wrap",
            gap: "8px",
          }}
        >
          <button
            type="button"
            class="ol-btn ol-btn--primary"
            disabled={startLoading()}
            onClick={start}
          >
            <TbPlayerPlay size={15} class="ol-ico" />
            <span>{t("indexes.start")}</span>
          </button>

          <button
            type="button"
            class="ol-btn ol-btn--danger"
            disabled={stopLoading() || progress()?.is_done}
            onClick={stop}
          >
            <TbPlayerStop size={15} class="ol-ico" />
            <span>{t("indexes.stop")}</span>
          </button>

          <button
            type="button"
            class="ol-btn"
            disabled={progressLoading()}
            onClick={() => refreshProgress()}
          >
            <TbRefresh size={15} class="ol-ico" />
            <span>{t("global.refresh")}</span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default Scan
