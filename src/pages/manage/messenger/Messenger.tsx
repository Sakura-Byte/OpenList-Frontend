import { Button, Input } from "@hope-ui/solid"
import { TbMessageCircle, TbRefresh, TbSend } from "solid-icons/tb"
import {
  Component,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Dynamic } from "solid-js/web"
import { useFetch, useT } from "~/hooks"
import { PEmptyResp, PResp } from "~/types"
import {
  handleRespWithNotifySuccess,
  handleRespWithoutNotify,
  notify,
  r,
} from "~/utils"
import { ImageShow, StringShow } from "./Show"

export interface Message {
  type: string
  content: any
}

export const Shower: Record<string, Component<Message>> = {
  string: StringShow,
  image: ImageShow,
}

export const Messenger = () => {
  const t = useT()
  onMount(() => {
    notify.info(t("manage.messenger-tips"))
  })

  const [toSend, setToSend] = createSignal("")
  const [getLoading, getR] = useFetch((): PResp<Message> =>
    r.post("/admin/message/get"),
  )
  const [sendLoading, sendR] = useFetch((): PEmptyResp =>
    r.post("/admin/message/send", {
      message: toSend(),
    }),
  )
  const [received, setReceived] = createStore<Message[]>([])

  const get = async () => {
    const resp = await getR()
    handleRespWithoutNotify(resp, (msg) => {
      setReceived(produce((msgs) => msgs.push(msg)))
    })
  }

  const send = async () => {
    const resp = await sendR()
    handleRespWithNotifySuccess(resp, () => {
      setToSend("")
    })
  }

  const getInterval = setInterval(get, 1000)
  onCleanup(() => clearInterval(getInterval))

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.received_msgs")}</h1>
          <p class="ol-admin-subtitle">{t("manage.messenger-tips")}</p>
        </div>
        <div class="ol-admin-head__actions">
          <Button
            size="sm"
            colorScheme="neutral"
            loading={getLoading()}
            onClick={get}
          >
            <TbRefresh
              size={15}
              class="ol-ico"
              style={{ "margin-right": "6px" }}
            />
            {t("manage.receive")}
          </Button>
        </div>
      </div>

      <section class="ol-admin-card">
        <Show
          when={received.length > 0}
          fallback={
            <div class="ol-admin-empty">
              <TbMessageCircle size={24} class="ol-ico" />
              <span>{t("manage.common.no_data")}</span>
            </div>
          }
        >
          <div class="ol-admin-form-stack" style={{ gap: "10px" }}>
            <For each={received}>
              {(item) => <Dynamic component={Shower[item.type]} {...item} />}
            </For>
          </div>
        </Show>
      </section>

      <section class="ol-admin-card">
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "flex-wrap": "wrap",
            gap: "10px",
          }}
        >
          <div style={{ flex: "1 1 240px", "min-width": "0" }}>
            <Input
              value={toSend()}
              onInput={(e) => setToSend(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  send()
                }
              }}
            />
          </div>
          <Button colorScheme="primary" loading={sendLoading()} onClick={send}>
            <TbSend
              size={15}
              class="ol-ico"
              style={{ "margin-right": "6px" }}
            />
            {t("manage.send")}
          </Button>
        </div>
      </section>
    </div>
  )
}

export default Messenger
