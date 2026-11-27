import { createSignal, Show } from "solid-js"
import { useFetch, useT } from "~/hooks"
import { PResp } from "~/types"
import { SSHPublicKey } from "~/types/sshkey"
import { handleResp, notify, r } from "~/utils"
import { DeletePopover } from "../common/DeletePopover"
import { PublicKeysProps } from "./PublicKeys"

const formatDate = (date: Date) => {
  if (Number.isNaN(date.getTime())) return "—"
  const year = date.getFullYear().toString()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

export interface PublicKeyCol {
  name: "title" | "fingerprint" | "last_used" | "operation"
  textAlign: "left" | "right" | "center"
  w: string
}

export const cols: PublicKeyCol[] = [
  { name: "title", textAlign: "left", w: "25%" },
  { name: "fingerprint", textAlign: "left", w: "45%" },
  { name: "last_used", textAlign: "right", w: "20%" },
  { name: "operation", textAlign: "right", w: "10%" },
]

export const PublicKey = (props: PublicKeysProps & SSHPublicKey) => {
  const t = useT()
  const [deleted, setDeleted] = createSignal(false)
  const [delLoading, del] = props.isMine
    ? useFetch((): PResp<SSHPublicKey[]> =>
        r.post(`/me/sshkey/delete?id=${props.id}`),
      )
    : useFetch((): PResp<SSHPublicKey[]> =>
        r.post(`/admin/user/sshkey/delete?uid=${props.userId}&id=${props.id}`),
      )

  return (
    <Show when={!deleted()}>
      <tr>
        <td style={{ "font-weight": 550, "white-space": "nowrap" }}>
          {props.title}
        </td>
        <td>
          <code
            style={{
              "font-family": "var(--ol-font-mono)",
              "font-size": "12.5px",
              color: "var(--ol-text-secondary)",
              "word-break": "break-all",
            }}
          >
            {props.fingerprint}
          </code>
        </td>
        <td
          class="ol-tabular"
          style={{
            "text-align": "right",
            "white-space": "nowrap",
            color: "var(--ol-text-muted)",
          }}
        >
          {formatDate(new Date(props.last_used_time))}
        </td>
        <td style={{ "text-align": "right", "white-space": "nowrap" }}>
          <DeletePopover
            name={props.title}
            loading={delLoading()}
            onClick={async () => {
              const resp = await del()
              handleResp(resp, () => {
                notify.success(t("global.delete_success"))
                setDeleted(true)
              })
            }}
          />
        </td>
      </tr>
    </Show>
  )
}
