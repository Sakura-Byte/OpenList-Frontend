import {
  Button,
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
import { TbKey, TbPlus } from "solid-icons/tb"
import { createSignal, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useFetch, useT } from "~/hooks"
import { PEmptyResp, PPageResp } from "~/types"
import { SSHPublicKey } from "~/types/sshkey"
import { handleResp, r } from "~/utils"
import { cols, PublicKey } from "./PublicKey"

export interface PublicKeysProps {
  isMine: boolean
  userId: number
}

export interface SSHKeyAddReq {
  title: string
  key: string
}

export const PublicKeys = (props: PublicKeysProps) => {
  const t = useT()
  const [keys, setKeys] = createSignal<SSHPublicKey[]>([])
  const [loading, get] = props.isMine
    ? useFetch((): PPageResp<SSHPublicKey> => r.get(`/me/sshkey/list`))
    : useFetch((): PPageResp<SSHPublicKey> =>
        r.get(`/admin/user/sshkey/list?uid=${props.userId}`),
      )
  const [addReq, setAddReq] = createStore<SSHKeyAddReq>({
    title: "",
    key: "",
  })
  const [addLoading, add] = useFetch((): PEmptyResp =>
    r.post(`/me/sshkey/add`, addReq),
  )
  const { isOpen, onOpen, onClose } = createDisclosure()
  const refresh = async () => {
    const resp = await get()
    handleResp(resp, (data) => {
      setKeys(data.content ?? [])
    })
  }
  refresh()

  return (
    <section class="ol-admin-card ol-admin-card--flush">
      <div class="ol-admin-card__head">
        <h2
          class="ol-admin-card__title"
          style={{
            display: "inline-flex",
            "align-items": "center",
            gap: "8px",
          }}
        >
          <TbKey size={17} class="ol-ico" />
          <span>{t("users.ssh_keys.heading")}</span>
        </h2>

        <Show when={props.isMine}>
          <Button loading={loading()} onClick={onOpen}>
            <TbPlus
              size={14}
              class="ol-ico"
              style={{ "margin-right": "4px" }}
            />
            {t("global.add")}
          </Button>

          <Modal opened={isOpen()} onClose={onClose} scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
              <ModalCloseButton />
              <ModalHeader>{t("users.ssh_keys.add_heading")}</ModalHeader>
              <ModalBody>
                <div class="ol-admin-form-stack">
                  <FormControl>
                    <FormLabel for="add_title">
                      {t("users.ssh_keys.title")}
                    </FormLabel>
                    <Input
                      id="add_title"
                      value={addReq.title}
                      onInput={(e) => setAddReq("title", e.currentTarget.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel for="add_key">
                      {t("users.ssh_keys.key")}
                    </FormLabel>
                    <Textarea
                      id="add_key"
                      rows={5}
                      value={addReq.key}
                      onInput={(e) => setAddReq("key", e.currentTarget.value)}
                    />
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
                  <Button colorScheme="neutral" onClick={onClose}>
                    {t("global.cancel")}
                  </Button>
                  <Button
                    colorScheme="accent"
                    loading={addLoading()}
                    onClick={async () => {
                      const resp = await add()
                      handleResp(resp, () => {
                        setAddReq("title", "")
                        setAddReq("key", "")
                        refresh()
                        onClose()
                      })
                    }}
                  >
                    {t("global.add")}
                  </Button>
                </div>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Show>
      </div>

      <Show
        when={keys().length > 0}
        fallback={
          <div class="ol-admin-empty">{t("manage.common.no_data")}</div>
        }
      >
        <div style={{ width: "100%", "overflow-x": "auto" }}>
          <table class="ol-admin-table">
            <thead>
              <tr>
                <For each={cols}>
                  {(col) => (
                    <th style={{ "text-align": col.textAlign }}>
                      {t(`users.ssh_keys.${col.name}`)}
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={keys()}>
                {(key) => <PublicKey {...props} {...key} />}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </section>
  )
}
