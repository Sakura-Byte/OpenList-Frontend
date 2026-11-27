import {
  createDisclosure,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Textarea,
} from "@hope-ui/solid"
import {
  TbAlertTriangle,
  TbPlayerPlay,
  TbPlayerStop,
  TbRefresh,
  TbTrash,
} from "solid-icons/tb"
import { createSignal, onCleanup, Show } from "solid-js"
import { useFetch, useT } from "~/hooks"
import { Group, PEmptyResp, PResp } from "~/types"
import {
  buildIndex,
  formatDate,
  handleResp,
  handleRespWithNotifySuccess,
  r,
  updateIndex,
} from "~/utils"
import CommonSettings from "../settings/Common"
import { IndexDoneIcon, IndexFolderIcon, IndexRunningIcon } from "./icons"

type Progress = {
  obj_count: number
  is_done: boolean
  last_done_time: string
  error: string
}

const Indexes = () => {
  const t = useT()
  const [progress, setProgress] = createSignal<Progress>()
  const [progressLoading, getProgressReq] = useFetch((): PResp<Progress> =>
    r.get("/admin/index/progress"),
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
      (_, code) => {
        resetRefreshTimeout(code !== 404)
      },
    )
  }
  refreshProgress()

  const [rebuildLoading, rebuildReq] = useFetch(buildIndex)
  const rebuild = async () => {
    const resp = await rebuildReq()
    handleRespWithNotifySuccess(resp)
    refreshProgress()
  }

  const [clearIndexLoading, clearIndexReq] = useFetch((): PEmptyResp =>
    r.post("/admin/index/clear"),
  )
  const clearIndex = async () => {
    const resp = await clearIndexReq()
    handleRespWithNotifySuccess(resp)
    refreshProgress()
  }

  const [stopBuildLoading, stopBuildReq] = useFetch((): PEmptyResp =>
    r.post("/admin/index/stop"),
  )
  const stopBuild = async () => {
    const resp = await stopBuildReq()
    handleRespWithNotifySuccess(resp)
    refreshProgress()
  }

  let updatePathsRef: HTMLTextAreaElement
  let updateMaxDepthRef: HTMLInputElement
  const [updateLoading, updateReq] = useFetch(updateIndex)
  const update = async () => {
    let updatePaths: string[] = []
    if (updatePathsRef!.value) {
      updatePaths = updatePathsRef!.value.split("\n")
    }
    let updateMaxDepth = 20
    if (updateMaxDepthRef!.value) {
      updateMaxDepth = parseInt(updateMaxDepthRef!.value)
    }
    const resp = await updateReq(updatePaths, updateMaxDepth)
    handleRespWithNotifySuccess(resp, () => onClose())
    refreshProgress()
  }

  const { isOpen, onOpen, onClose } = createDisclosure()

  return (
    <>
      <section class="ol-admin-card">
        <div class="ol-admin-card__head">
          <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
            <Show
              when={progress()?.is_done !== false}
              fallback={<IndexRunningIcon size={18} />}
            >
              <IndexDoneIcon size={18} />
            </Show>
            <h2 class="ol-admin-card__title">{t("indexes.current")}</h2>
          </div>

          <Show when={progress()}>
            {(p) => (
              <span class="ol-status">
                <span
                  class="ol-status-dot"
                  data-status={
                    p().error ? "error" : p().is_done ? "work" : "info"
                  }
                />
                <span>
                  {p().is_done ? t("indexes.idle") : t("indexes.running")}
                </span>
              </span>
            )}
          </Show>
        </div>

        <div class="ol-admin-form-stack">
          <Show when={progress()}>
            {(p) => (
              <>
                <div class="ol-admin-stat-grid">
                  <div class="ol-admin-stat" style={{ padding: "12px 16px" }}>
                    <div class="ol-admin-stat__head">
                      <span>{t("indexes.obj_count")}</span>
                      <IndexFolderIcon size={16} />
                    </div>
                    <div
                      class="ol-admin-stat__value ol-tabular"
                      style={{ "font-size": "22px" }}
                    >
                      {p().obj_count.toLocaleString()}
                    </div>
                  </div>

                  <div class="ol-admin-stat" style={{ padding: "12px 16px" }}>
                    <div class="ol-admin-stat__head">
                      <span>{t("indexes.last_done_time")}</span>
                    </div>
                    <div
                      class="ol-tabular"
                      style={{
                        "font-size": "15px",
                        "font-weight": "600",
                        color: "var(--ol-text-primary)",
                      }}
                    >
                      {p().last_done_time
                        ? formatDate(p().last_done_time)
                        : t("indexes.unknown")}
                    </div>
                  </div>
                </div>

                <Show when={p().error}>
                  <div
                    role="alert"
                    style={{
                      display: "flex",
                      "align-items": "flex-start",
                      gap: "8px",
                      padding: "10px 12px",
                      "border-radius": "var(--ol-radius-sm)",
                      background: "var(--ol-danger-soft)",
                      color: "var(--ol-danger)",
                      "font-size": "13px",
                      "word-break": "break-word",
                    }}
                  >
                    <TbAlertTriangle
                      size={16}
                      class="ol-ico"
                      style={{ "margin-top": "2px" }}
                    />
                    <span>
                      {t("indexes.error")}: {p().error}
                    </span>
                  </div>
                </Show>
              </>
            )}
          </Show>

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
              class="ol-btn"
              disabled={progressLoading()}
              onClick={() => refreshProgress()}
            >
              <TbRefresh size={15} class="ol-ico" />
              <span>{t("global.refresh")}</span>
            </button>

            <button
              type="button"
              class="ol-btn ol-btn--primary"
              disabled={rebuildLoading()}
              onClick={() => rebuild()}
            >
              <TbPlayerPlay size={15} class="ol-ico" />
              <span>
                {t(`indexes.${progress()?.is_done ? "rebuild" : "build"}`)}
              </span>
            </button>

            <button type="button" class="ol-btn" onClick={onOpen}>
              <IndexFolderIcon size={15} />
              <span>{t("indexes.update")}</span>
            </button>

            <button
              type="button"
              class="ol-btn"
              disabled={stopBuildLoading() || progress()?.is_done}
              onClick={() => stopBuild()}
            >
              <TbPlayerStop size={15} class="ol-ico" />
              <span>{t("indexes.stop")}</span>
            </button>

            <button
              type="button"
              class="ol-btn ol-btn--danger"
              disabled={clearIndexLoading()}
              onClick={() => clearIndex()}
            >
              <TbTrash size={15} class="ol-ico" />
              <span>{t("indexes.clear")}</span>
            </button>
          </div>
        </div>
      </section>

      <section class="ol-admin-card">
        <div class="ol-admin-card__head">
          <h2 class="ol-admin-card__title">{t("indexes.index_header")}</h2>
        </div>
        <CommonSettings group={Group.INDEX} />
      </section>

      <Modal opened={isOpen()} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>{t("indexes.update")}</ModalHeader>
          <ModalBody>
            <div class="ol-admin-form-stack">
              <FormControl w="$full" display="flex" flexDirection="column">
                <FormLabel>{t("indexes.paths_to_update")}</FormLabel>
                <Textarea rows={4} ref={updatePathsRef!} />
              </FormControl>
              <FormControl w="$full" display="flex" flexDirection="column">
                <FormLabel>{t("indexes.max_depth")}</FormLabel>
                <Input value={20} type="number" ref={updateMaxDepthRef!} />
              </FormControl>
            </div>
          </ModalBody>
          <ModalFooter>
            <div
              style={{
                display: "flex",
                "align-items": "center",
                gap: "8px",
              }}
            >
              <button type="button" class="ol-btn" onClick={onClose}>
                <span>{t("global.cancel")}</span>
              </button>
              <button
                type="button"
                class="ol-btn ol-btn--primary"
                disabled={updateLoading()}
                onClick={() => update()}
              >
                <TbRefresh size={15} class="ol-ico" />
                <span>{t("indexes.update")}</span>
              </button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default Indexes
