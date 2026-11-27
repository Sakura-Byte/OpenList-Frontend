import { Button } from "@hope-ui/solid"
import { TbFingerprint, TbTrash } from "solid-icons/tb"
import { createSignal, Show } from "solid-js"
import { useFetch, useT } from "~/hooks"
import { PEmptyResp } from "~/types"
import { handleResp, notify, r } from "~/utils"

interface WebauthnItemProps {
  id: string
  fingerprint: string
}

export const WebauthnItem = (props: WebauthnItemProps) => {
  const t = useT()
  const [removeLoading, remove] = useFetch((): PEmptyResp =>
    r.post(`/authn/delete_authn`, {
      id: props.id,
    }),
  )
  const [deleted, setDeleted] = createSignal(false)

  return (
    <Show when={!deleted()}>
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          "flex-wrap": "wrap",
          gap: "10px 14px",
          width: "100%",
          padding: "10px 14px",
          "border-radius": "var(--ol-radius-md)",
          border: "1px solid var(--ol-border)",
          background: "var(--ol-surface-2)",
        }}
      >
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "10px",
            "min-width": "0",
            flex: "1",
          }}
        >
          <TbFingerprint
            size={18}
            class="ol-ico"
            style={{ color: "var(--ol-accent-text)", "flex-shrink": 0 }}
          />
          <div
            style={{
              display: "flex",
              "flex-direction": "column",
              gap: "2px",
              "min-width": "0",
            }}
          >
            <code
              style={{
                "font-family": "var(--ol-font-mono)",
                "font-size": "12.5px",
                "font-weight": 550,
                color: "var(--ol-text-primary)",
                "word-break": "break-all",
              }}
            >
              {t("users.ssh_keys.fingerprint")}: {props.fingerprint}
            </code>
            <code
              style={{
                "font-family": "var(--ol-font-mono)",
                "font-size": "11.5px",
                color: "var(--ol-text-muted)",
                "word-break": "break-all",
              }}
            >
              ID: {props.id}
            </code>
          </div>
        </div>

        <Button
          colorScheme="danger"
          loading={removeLoading()}
          onClick={async () => {
            const resp = await remove()
            handleResp(resp, () => {
              notify.success(t("global.delete_success"))
              setDeleted(true)
            })
          }}
        >
          <TbTrash size={14} class="ol-ico" style={{ "margin-right": "4px" }} />
          {t("global.delete")}
        </Button>
      </div>
    </Show>
  )
}
