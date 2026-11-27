import { TbCopy, TbEdit, TbPlayerPause, TbPlayerPlay } from "solid-icons/tb"
import { Show } from "solid-js"
import { useFetch, useRouter, useT, useUtil } from "~/hooks"
import { getSetting, me } from "~/store"
import { PEmptyResp, ShareInfo, UserMethods } from "~/types"
import {
  handleResp,
  handleRespWithNotifySuccess,
  makeTemplateData,
  matchTemplate,
  notify,
  r,
} from "~/utils"
import { DeletePopover } from "../common/DeletePopover"

interface ShareProps {
  share: ShareInfo
  refresh: () => void
  canShare: boolean
}

export type ShareStatusKind = "work" | "disabled" | "invalid" | "denied"

export const getShareStatus = (
  share: ShareInfo,
  canShare: boolean,
): ShareStatusKind => {
  if (share.disabled) {
    return "disabled"
  }
  if (
    (share.max_accessed > 0 && share.accessed >= share.max_accessed) ||
    share.files.length === 0 ||
    (share.expires && new Date(share.expires) < new Date())
  ) {
    return "invalid"
  }
  if (share.creator === me().username && !canShare) {
    return "denied"
  }
  return "work"
}

const statusDotMap: Record<
  ShareStatusKind,
  "work" | "disabled" | "warn" | "error"
> = {
  work: "work",
  disabled: "disabled",
  invalid: "warn",
  denied: "error",
}

function ShareOp(props: ShareProps) {
  const t = useT()
  const { to } = useRouter()
  const [deleteLoading, deleteShare] = useFetch((): PEmptyResp =>
    r.post(`/share/delete?id=${props.share.id}`),
  )
  const [enableOrDisableLoading, enableOrDisable] = useFetch((): PEmptyResp =>
    r.post(
      `/share/${props.share.disabled ? "enable" : "disable"}?id=${props.share.id}`,
    ),
  )
  return (
    <>
      <button
        type="button"
        class="ol-btn"
        disabled={!props.canShare}
        onClick={() => {
          to(`/@manage/shares/edit/${props.share.id}`)
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
        {props.share.disabled ? (
          <TbPlayerPlay size={14} class="ol-ico" />
        ) : (
          <TbPlayerPause size={14} class="ol-ico" />
        )}
        <span>
          {t(`global.${props.share.disabled ? "enable" : "disable"}`)}
        </span>
      </button>
      <DeletePopover
        name={props.share.id}
        loading={deleteLoading()}
        onClick={async () => {
          const resp = await deleteShare()
          handleResp(resp, () => {
            notify.success(t("global.delete_success"))
            props.refresh()
          })
        }}
      />
    </>
  )
}

const Creator = (props: { name: string; role: number }) => {
  if (props.role < 0) return null
  return (
    <span
      class="ol-pill"
      style={{
        "max-width": "160px",
        overflow: "hidden",
        "text-overflow": "ellipsis",
      }}
      title={props.name}
    >
      {props.name}
    </span>
  )
}

export function ShareListItem(props: ShareProps) {
  const t = useT()
  const { copy } = useUtil()

  const path = () => {
    if (props.share.files.length === 0) {
      return ""
    }
    let p = props.share.files[0]
    if (props.share.files.length > 1) {
      p += t("shares.files_etc", {
        more: props.share.files.length - 1,
      })
    }
    return p
  }

  const accessed = () => {
    return props.share.max_accessed > 0
      ? `${props.share.accessed} / ${props.share.max_accessed}`
      : `${props.share.accessed}`
  }

  const status = () => getShareStatus(props.share, props.canShare)

  return (
    <tr>
      <td
        style={{
          "font-family": "var(--ol-font-mono)",
          "font-weight": "500",
          "word-break": "break-all",
          "min-width": "180px",
        }}
      >
        {path() || "—"}
      </td>
      <td>
        <span class="ol-pill" style={{ "font-family": "var(--ol-font-mono)" }}>
          {props.share.id}
        </span>
      </td>
      <Show when={UserMethods.is_admin(me())}>
        <td>
          <Creator name={props.share.creator} role={props.share.creator_role} />
        </td>
      </Show>
      <td
        class="ol-tabular"
        style={{
          color: "var(--ol-text-secondary)",
          "white-space": "nowrap",
        }}
      >
        {props.share.expires
          ? new Date(props.share.expires).toLocaleString()
          : "—"}
      </td>
      <td class="ol-tabular">{accessed()}</td>
      <td>
        <span class="ol-status">
          <span class="ol-status-dot" data-status={statusDotMap[status()]} />
          <span>{t(`shares.status_list.${status()}`)}</span>
        </span>
      </td>
      <td
        style={{
          color: "var(--ol-text-secondary)",
          "max-width": "220px",
          "word-break": "break-word",
        }}
      >
        {props.share.remark || "—"}
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
          <button
            type="button"
            class="ol-btn"
            onClick={() => {
              const templateData = makeTemplateData(props.share, {
                site_title: getSetting("site_title"),
              })
              const msg = matchTemplate(
                getSetting("share_summary_content"),
                templateData,
              )
              copy(msg)
            }}
          >
            <TbCopy size={14} class="ol-ico" />
            <span>{t("shares.copy_msg")}</span>
          </button>
          <ShareOp {...props} />
        </div>
      </td>
    </tr>
  )
}
