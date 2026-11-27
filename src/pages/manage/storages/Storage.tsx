import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@hope-ui/solid"
import {
  TbCopy,
  TbEdit,
  TbPlayerPause,
  TbPlayerPlay,
  TbRefresh,
} from "solid-icons/tb"
import { createSignal, Show } from "solid-js"
import { useFetch, useRouter, useT, useUtil } from "~/hooks"
import { MountDetails, PEmptyResp, Storage } from "~/types"
import {
  handleResp,
  handleRespWithNotifySuccess,
  nearlyFull,
  notify,
  r,
  showDiskUsage,
  toReadableUsage,
  usedPercentage,
} from "~/utils"
import { DeletePopover } from "../common/DeletePopover"
import { ASMRONESyncPanel, useASMRONETranslation } from "./ASMRONESyncPanel"
import { JMComicSyncPanel, useJMComicTranslation } from "./JMComicSyncPanel"

interface StorageProps {
  storage: Storage
  refresh: () => void
}

export const storageStatusKind = (
  storage: Storage,
): "work" | "disabled" | "error" => {
  if (storage.disabled) return "disabled"
  return storage.status === "work" ? "work" : "error"
}

export const storageStatusText = (
  storage: Storage,
  t: ReturnType<typeof useT>,
): string => {
  if (storage.disabled && (!storage.status || storage.status === "disabled")) {
    return t("manage.common.status_disabled")
  }
  if (storage.status === "work") {
    return t("manage.common.status_work")
  }
  return t(
    `storages.table_fields.status.${storage.status}`,
    undefined,
    storage.status || t("manage.common.status_error"),
  )
}

function StorageUsage(props: { details: MountDetails | undefined }) {
  return (
    <Show when={showDiskUsage(props.details) ? props.details : undefined}>
      {(details) => {
        const pct = () => Math.min(100, Math.max(0, usedPercentage(details())))
        const full = () => nearlyFull(details())
        return (
          <div
            style={{
              display: "flex",
              "flex-direction": "column",
              gap: "4px",
              "min-width": "136px",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "6px",
                "border-radius": "999px",
                background: "var(--ol-surface-2)",
                border: "1px solid var(--ol-border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct()}%`,
                  height: "100%",
                  "border-radius": "999px",
                  background: full() ? "var(--ol-danger)" : "var(--ol-accent)",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <span
              class="ol-tabular"
              style={{
                "font-size": "12px",
                color: full() ? "var(--ol-danger)" : "var(--ol-text-muted)",
              }}
            >
              {toReadableUsage(details())}
            </span>
          </div>
        )
      }}
    </Show>
  )
}

function StorageOp(props: StorageProps) {
  const t = useT()
  const asmroneT = useASMRONETranslation()
  const jmcomicT = useJMComicTranslation()
  const { to } = useRouter()
  const { copy } = useUtil()
  const [syncOpen, setSyncOpen] = createSignal(false)

  const [deleteLoading, deleteStorage] = useFetch((): PEmptyResp =>
    r.post(`/admin/storage/delete?id=${props.storage.id}`),
  )
  const [enableOrDisableLoading, enableOrDisable] = useFetch((): PEmptyResp =>
    r.post(
      `/admin/storage/${props.storage.disabled ? "enable" : "disable"}?id=${
        props.storage.id
      }`,
    ),
  )

  const isAsmr = () => props.storage.driver === "ASMR.ONE"
  const isJm = () => props.storage.driver === "JMComic"
  const hasSyncPanel = () => isAsmr() || isJm()
  const syncTitle = () =>
    isAsmr() ? asmroneT("title") : isJm() ? jmcomicT("title") : ""

  return (
    <>
      <button
        type="button"
        class="ol-btn"
        onClick={() => {
          to(`/@manage/storages/edit/${props.storage.id}`)
        }}
      >
        <TbEdit size={14} class="ol-ico" />
        <span>{t("global.edit")}</span>
      </button>

      <button
        type="button"
        class="ol-btn"
        disabled={enableOrDisableLoading()}
        onClick={async () => {
          const resp = await enableOrDisable()
          handleRespWithNotifySuccess(resp, () => {
            props.refresh()
          })
        }}
      >
        {props.storage.disabled ? (
          <TbPlayerPlay size={14} class="ol-ico" />
        ) : (
          <TbPlayerPause size={14} class="ol-ico" />
        )}
        <span>
          {t(`global.${props.storage.disabled ? "enable" : "disable"}`)}
        </span>
      </button>

      <button
        type="button"
        class="ol-btn"
        title={t("storages.common.export_title")}
        onClick={() => {
          copy(JSON.stringify(props.storage))
        }}
      >
        <TbCopy size={14} class="ol-ico" />
        <span>{t("global.copy")}</span>
      </button>

      <Show when={hasSyncPanel()}>
        <button
          type="button"
          class="ol-btn"
          onClick={() => setSyncOpen(true)}
          title={syncTitle()}
        >
          <TbRefresh size={14} class="ol-ico" />
          <span>{syncTitle()}</span>
        </button>
      </Show>

      <DeletePopover
        name={props.storage.mount_path}
        loading={deleteLoading()}
        onClick={async () => {
          const resp = await deleteStorage()
          handleResp(resp, () => {
            notify.success(t("global.delete_success"))
            props.refresh()
          })
        }}
      />

      <Show when={syncOpen()}>
        <Modal size="xl" opened={syncOpen()} onClose={() => setSyncOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalCloseButton />
            <ModalHeader>{props.storage.mount_path}</ModalHeader>
            <ModalBody style={{ "padding-bottom": "18px" }}>
              <Show when={isAsmr()}>
                <ASMRONESyncPanel
                  storageId={props.storage.id}
                  disabled={props.storage.disabled}
                />
              </Show>
              <Show when={isJm()}>
                <JMComicSyncPanel
                  storageId={props.storage.id}
                  disabled={props.storage.disabled}
                />
              </Show>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Show>
    </>
  )
}

export function StorageGridItem(props: StorageProps) {
  const t = useT()
  const kind = () => storageStatusKind(props.storage)

  return (
    <article
      class="ol-admin-card"
      style={{
        display: "flex",
        "flex-direction": "column",
        "justify-content": "space-between",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            "align-items": "flex-start",
            "justify-content": "space-between",
            gap: "8px",
          }}
        >
          <span
            style={{
              "font-family": "var(--ol-font-mono)",
              "font-size": "14px",
              "font-weight": "600",
              color: "var(--ol-text-primary)",
              "word-break": "break-all",
              "line-height": "1.35",
            }}
          >
            {props.storage.mount_path}
          </span>
          <span
            class="ol-pill ol-tabular"
            title={t("storages.common.order")}
            style={{ flex: "none" }}
          >
            #{props.storage.order}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            "align-items": "center",
            "flex-wrap": "wrap",
            gap: "8px",
          }}
        >
          <span class="ol-pill">
            {t(
              `drivers.drivers.${props.storage.driver}`,
              undefined,
              props.storage.driver,
            )}
          </span>
          <span class="ol-status" style={{ "min-width": "0" }}>
            <span class="ol-status-dot" data-status={kind()} />
            <span style={{ "word-break": "break-word" }}>
              {storageStatusText(props.storage, t)}
            </span>
          </span>
        </div>

        <StorageUsage details={props.storage.mount_details} />

        <Show when={props.storage.remark}>
          <p
            style={{
              margin: "0",
              "font-size": "12.5px",
              color: "var(--ol-text-muted)",
              "word-break": "break-word",
              "white-space": "pre-wrap",
            }}
          >
            {props.storage.remark}
          </p>
        </Show>
      </div>

      <div class="ol-admin-card__foot" style={{ "margin-top": "4px" }}>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "flex-wrap": "wrap",
            gap: "6px",
          }}
        >
          <StorageOp {...props} />
        </div>
      </div>
    </article>
  )
}

export function StorageListItem(props: StorageProps) {
  const t = useT()
  const kind = () => storageStatusKind(props.storage)

  return (
    <tr>
      <td
        style={{
          "font-family": "var(--ol-font-mono)",
          "font-weight": "500",
          "word-break": "break-all",
          "min-width": "150px",
        }}
      >
        {props.storage.mount_path}
      </td>
      <td>
        <span class="ol-pill">
          {t(
            `drivers.drivers.${props.storage.driver}`,
            undefined,
            props.storage.driver,
          )}
        </span>
      </td>
      <td class="ol-tabular">{props.storage.order}</td>
      <td style={{ "min-width": "150px" }}>
        <StorageUsage details={props.storage.mount_details} />
      </td>
      <td style={{ "max-width": "260px" }}>
        <span class="ol-status">
          <span class="ol-status-dot" data-status={kind()} />
          <span style={{ "word-break": "break-word" }}>
            {storageStatusText(props.storage, t)}
          </span>
        </span>
      </td>
      <td
        style={{
          color: "var(--ol-text-secondary)",
          "max-width": "220px",
          "word-break": "break-word",
        }}
      >
        {props.storage.remark || "—"}
      </td>
      <td>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "flex-wrap": "wrap",
            gap: "6px",
          }}
        >
          <StorageOp {...props} />
        </div>
      </td>
    </tr>
  )
}
