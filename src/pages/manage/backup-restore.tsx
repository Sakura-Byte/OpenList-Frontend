import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Switch as HopeSwitch,
} from "@hope-ui/solid"
import crypto from "crypto-js"
import {
  TbCircleCheck,
  TbCircleX,
  TbDatabaseExport,
  TbDatabaseImport,
  TbDownload,
  TbInfoCircle,
  TbTerminal2,
  TbTrash,
  TbUpload,
} from "solid-icons/tb"
import { createSignal, For, Match, Show, Switch } from "solid-js"
import { useFetch, useManageTitle, useT } from "~/hooks"
import {
  Meta,
  PEmptyResp,
  PPageResp,
  PResp,
  Resp,
  SettingItem,
  ShareInfo,
  Storage,
  User,
} from "~/types"
import { handleRespWithoutNotify, notify, r } from "~/utils"

interface Data {
  encrypted: string
  settings: SettingItem[]
  users: User[]
  storages: Storage[]
  metas: Meta[]
  shares: ShareInfo[]
}

type LogType = "success" | "error" | "info"

const Log = (props: { msg: string; type: LogType }) => {
  const color = () => {
    if (props.type === "success") return "var(--ol-type-image)"
    if (props.type === "error") return "var(--ol-danger)"
    return "var(--ol-text-secondary)"
  }

  return (
    <div
      style={{
        display: "flex",
        "align-items": "flex-start",
        gap: "8px",
        padding: "4px 0",
        color: color(),
        "word-break": "break-word",
      }}
    >
      <span style={{ flex: "none", "margin-top": "2px" }}>
        <Switch>
          <Match when={props.type === "success"}>
            <TbCircleCheck
              size={15}
              class="ol-ico"
              style={{ color: "var(--ol-type-image)" }}
            />
          </Match>
          <Match when={props.type === "error"}>
            <TbCircleX
              size={15}
              class="ol-ico"
              style={{ color: "var(--ol-danger)" }}
            />
          </Match>
          <Match when={props.type === "info"}>
            <TbInfoCircle
              size={15}
              class="ol-ico"
              style={{ color: "var(--ol-accent-text)" }}
            />
          </Match>
        </Switch>
      </span>
      <span>{props.msg}</span>
    </div>
  )
}

const BackupRestore = () => {
  const [override, setOverride] = createSignal(false)
  const [password, setPassword] = createSignal("")
  const t = useT()
  useManageTitle("manage.sidemenu.backup-restore")
  let logRef!: HTMLDivElement
  const [log, setLog] = createSignal<
    {
      type: LogType
      msg: string
    }[]
  >([])

  const appendLog = (msg: string, type: LogType) => {
    setLog((prev) => [...prev, { type, msg }])
    queueMicrotask(() => {
      if (logRef) {
        logRef.scrollTop = logRef.scrollHeight
      }
    })
  }

  const [getSettingsLoading, getSettings] = useFetch((): PResp<any> =>
    r.get("/admin/setting/list"),
  )
  const [getUsersLoading, getUsers] = useFetch((): PPageResp<User> =>
    r.get("/admin/user/list"),
  )
  const [getMetasLoading, getMetas] = useFetch((): PPageResp<Meta> =>
    r.get("/admin/meta/list"),
  )
  const [getStoragesLoading, getStorages] = useFetch((): PPageResp<Storage> =>
    r.get("/admin/storage/list"),
  )
  const [getSharesLoading, getShares] = useFetch((): PPageResp<ShareInfo> =>
    r.get("/share/list"),
  )

  const backupLoading = () => {
    return (
      getSettingsLoading() ||
      getUsersLoading() ||
      getMetasLoading() ||
      getStoragesLoading() ||
      getSharesLoading()
    )
  }

  function encrypt(data: any, key: string): string {
    if (key == "") return data
    const encJson = crypto.AES.encrypt(JSON.stringify(data), key).toString()
    return crypto.enc.Base64.stringify(crypto.enc.Utf8.parse(encJson))
  }

  function decrypt(
    data: any,
    key: string,
    raw: boolean,
    encrypted: boolean,
  ): string {
    if (!encrypted) return data
    const decData = crypto.enc.Base64.parse(data).toString(crypto.enc.Utf8)
    if (raw) return crypto.AES.decrypt(decData, key).toString(crypto.enc.Utf8)
    return JSON.parse(
      crypto.AES.decrypt(decData, key).toString(crypto.enc.Utf8),
    )
  }

  const backup = async () => {
    appendLog(t("br.start_backup"), "info")
    const allData: Data = {
      encrypted: "",
      settings: [],
      users: [],
      storages: [],
      metas: [],
      shares: [],
    }
    if (password() != "") allData.encrypted = encrypt("encrypted", password())
    for (const item of [
      { name: "settings", fn: getSettings, page: false },
      { name: "users", fn: getUsers, page: true },
      { name: "storages", fn: getStorages, page: true },
      { name: "metas", fn: getMetas, page: true },
      { name: "shares", fn: getShares, page: true },
    ] as const) {
      const resp = await item.fn()
      handleRespWithoutNotify(
        resp as Resp<any>,
        (data) => {
          appendLog(
            t("br.success_backup_item", {
              item: t(`manage.sidemenu.${item.name}`),
            }),
            "success",
          )
          if (item.page) {
            for (let i = 0; i < data.content.length; i++) {
              const obj = data.content[i]
              for (const key in obj) {
                obj[key] = encrypt(obj[key], password())
              }
            }
            allData[item.name] = data.content
          } else {
            for (let i = 0; i < data.length; i++) {
              const obj = data[i]
              for (const key in obj) {
                obj[key] = encrypt(obj[key], password())
              }
            }
            allData[item.name] = data
          }
        },
        (msg) => {
          appendLog(
            t("br.failed_backup_item", {
              item: t(`manage.sidemenu.${item.name}`),
            }) +
              ":" +
              msg,
            "error",
          )
        },
      )
    }
    download(
      "openlist_backup_" + new Date().toLocaleString() + ".json",
      allData,
    )
    appendLog(t("br.finish_backup"), "info")
  }

  const [addSettingsLoading, addSettings] = useFetch(
    (data: SettingItem[]): PEmptyResp => r.post("/admin/setting/save", data),
  )
  const [addUserLoading, addUser] = useFetch((user: User): PEmptyResp => {
    return r.post(`/admin/user/create`, user)
  })
  const [addStorageLoading, addStorage] = useFetch(
    (storage: Storage): PEmptyResp => {
      return r.post(`/admin/storage/create`, storage)
    },
  )
  const [addMetaLoading, addMeta] = useFetch((meta: Meta): PEmptyResp => {
    return r.post(`/admin/meta/create`, meta)
  })
  const [addShareLoading, addShare] = useFetch(
    (share: ShareInfo): PEmptyResp => {
      return r.post(`/share/create`, share)
    },
  )
  const [updateUserLoading, updateUser] = useFetch((user: User): PEmptyResp => {
    return r.post(`/admin/user/update`, user)
  })
  const [updateStorageLoading, updateStorage] = useFetch(
    (storage: Storage): PEmptyResp => {
      return r.post(`/admin/storage/update`, storage)
    },
  )
  const [updateMetaLoading, updateMeta] = useFetch((meta: Meta): PEmptyResp => {
    return r.post(`/admin/meta/update`, meta)
  })
  const [updateShareLoading, updateShare] = useFetch(
    (share: ShareInfo): PEmptyResp => {
      return r.post(`/share/update`, share)
    },
  )

  async function handleOvrData<T>(
    dataArray: T[],
    getDataFunc: { (): PResp<{ content: T[]; total: number }> },
    addDataFunc: {
      (t: T): PEmptyResp
    },
    updateDataFunc: {
      (t: T): PEmptyResp
    },
    idFieldName: keyof T,
    itemName: string,
  ) {
    const currentData = (await getDataFunc()).data.content
    for (const i in dataArray) {
      const currentItem = dataArray[i]
      const currentIdValue = currentItem[idFieldName]
      const currentDataItem = currentData.find(
        (d) => d[idFieldName] === currentIdValue,
      )
      const method = currentDataItem ? "update" : "add"
      const handleDataFunc = method === "add" ? addDataFunc : updateDataFunc
      await handleRespWithoutNotify(
        await handleDataFunc(currentItem),
        () => {
          appendLog(
            t("br.success_restore_item", {
              item: t(itemName),
            }) +
              "-" +
              `[${currentIdValue}]`,
            "success",
          )
        },
        (msg) => {
          appendLog(
            t("br.failed_restore_item", {
              item: t(itemName),
            }) +
              "-" +
              `[${currentIdValue}]` +
              ":" +
              msg,
            "error",
          )
        },
      )
    }
  }

  const restoreLoading = () => {
    return (
      addSettingsLoading() ||
      addUserLoading() ||
      addStorageLoading() ||
      addMetaLoading() ||
      addShareLoading() ||
      updateUserLoading() ||
      updateStorageLoading() ||
      updateMetaLoading() ||
      updateShareLoading()
    )
  }

  const restore = async () => {
    appendLog(t("br.start_restore"), "info")
    const file = document.createElement("input")
    file.type = "file"
    file.accept = "application/json"
    file.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files || files.length === 0) {
        notify.warning(t("br.no_file"))
        return
      }
      const selectedFile = files[0]
      const reader = new FileReader()
      reader.onload = async () => {
        const data: Data = JSON.parse(reader.result as string)
        const encrypted = Boolean(data.encrypted)
        if (encrypted)
          if (
            decrypt(data.encrypted, password(), true, true) !== '"encrypted"'
          ) {
            appendLog(t("br.wrong_encrypt_password"), "error")
            return
          }
        // 解密 settings + users/storages/metas/shares（备份时这 5 个数组均被加密）。
        // 原实现用 Object.values(data) 从 length-4 开始解密，会漏掉 settings
        // （加密备份恢复后 settings 仍是密文，导致 customize_head/body 等配置失效）。
        for (const name of [
          "settings",
          "users",
          "storages",
          "metas",
          "shares",
        ] as const) {
          const arr = (data as any)[name]
          if (!Array.isArray(arr)) continue
          for (const obj1 of arr) {
            for (const key in obj1) {
              obj1[key] = decrypt(obj1[key], password(), false, encrypted)
            }
          }
        }
        if (override()) {
          await backup()
        }
        data.settings &&
          handleRespWithoutNotify(
            await addSettings(
              data.settings.filter(
                (s) => !["version", "index_progress"].includes(s.key),
              ),
            ),
            () => {
              appendLog(
                t("br.success_restore_item", {
                  item: t("manage.sidemenu.settings"),
                }),
                "success",
              )
            },
            (msg) => {
              appendLog(
                t("br.failed_restore_item", {
                  item: t("manage.sidemenu.settings"),
                }) +
                  ":" +
                  msg,
                "error",
              )
            },
          )
        if (override()) {
          await handleOvrData(
            data.users,
            getUsers,
            addUser,
            updateUser,
            "username",
            "manage.sidemenu.users",
          )
          await handleOvrData(
            data.storages,
            getStorages,
            addStorage,
            updateStorage,
            "mount_path",
            "manage.sidemenu.storages",
          )
          await handleOvrData(
            data.metas,
            getMetas,
            addMeta,
            updateMeta,
            "path",
            "manage.sidemenu.metas",
          )
          await handleOvrData(
            data.shares,
            getShares,
            addShare,
            updateShare,
            "id",
            "manage.sidemenu.shares",
          )
        } else {
          for (const item of [
            {
              name: "users",
              fn: addUser,
              data: data.users,
              key: "username",
              removeId: true,
            },
            {
              name: "storages",
              fn: addStorage,
              data: data.storages,
              key: "mount_path",
              removeId: true,
            },
            {
              name: "metas",
              fn: addMeta,
              data: data.metas,
              key: "path",
              removeId: true,
            },
            {
              name: "shares",
              fn: addShare,
              data: data.shares,
              key: "id",
              removeId: false,
            },
          ] as const) {
            for (const itemData of item.data || []) {
              if (item.removeId) {
                itemData.id = 0
              }
              handleRespWithoutNotify(
                await item.fn(itemData),
                () => {
                  appendLog(
                    t("br.success_restore_item", {
                      item: t(`manage.sidemenu.${item.name}`),
                    }) +
                      "-" +
                      `[${(itemData as any)[item.key]}]`,
                    "success",
                  )
                },
                (msg) => {
                  appendLog(
                    t("br.failed_restore_item", {
                      item: t(`manage.sidemenu.${item.name}`),
                    }) +
                      ` [ ${(itemData as any)[item.key]} ] ` +
                      ":" +
                      msg,
                    "error",
                  )
                },
              )
            }
          }
        }
        appendLog(t("br.finish_restore"), "info")
      }
      reader.readAsText(selectedFile)
    }
    file.click()
  }

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.sidemenu.backup-restore")}</h1>
        </div>
      </div>

      <div class="ol-admin-grid">
        {/* Export / Backup Card */}
        <section
          class="ol-admin-card"
          style={{
            display: "flex",
            "flex-direction": "column",
            "justify-content": "space-between",
          }}
        >
          <div>
            <div class="ol-admin-card__head">
              <div
                style={{ display: "flex", "align-items": "center", gap: "8px" }}
              >
                <TbDatabaseExport size={17} class="ol-ico" />
                <h2 class="ol-admin-card__title">{t("br.backup")}</h2>
              </div>
            </div>

            <div class="ol-admin-form-stack">
              <FormControl w="100%" display="flex" flexDirection="column">
                <FormLabel for="password">{t("br.encrypt_password")}</FormLabel>
                <Input
                  id="password"
                  type="password"
                  value={password()}
                  placeholder={t("br.encrypt_password_placeholder")}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                />
              </FormControl>
            </div>
          </div>

          <div
            class="ol-admin-card__foot"
            style={{ "justify-content": "flex-end" }}
          >
            <Button
              colorScheme="primary"
              loading={backupLoading()}
              onClick={() => {
                backup()
              }}
            >
              <TbDownload
                size={15}
                class="ol-ico"
                style={{ "margin-right": "6px" }}
              />
              {t("br.backup")}
            </Button>
          </div>
        </section>

        {/* Encrypted Import / Restore Card */}
        <section
          class="ol-admin-card"
          style={{
            display: "flex",
            "flex-direction": "column",
            "justify-content": "space-between",
          }}
        >
          <div>
            <div class="ol-admin-card__head">
              <div
                style={{ display: "flex", "align-items": "center", gap: "8px" }}
              >
                <TbDatabaseImport size={17} class="ol-ico" />
                <h2 class="ol-admin-card__title">{t("br.restore")}</h2>
              </div>
            </div>

            <div class="ol-admin-form-stack">
              <FormControl w="100%" display="flex" flexDirection="column">
                <FormLabel for="restore-password">
                  {t("br.encrypt_password")}
                </FormLabel>
                <Input
                  id="restore-password"
                  type="password"
                  value={password()}
                  placeholder={t("br.encrypt_password_placeholder")}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                />
              </FormControl>

              <FormControl
                w="100%"
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <FormLabel for="restore-override" mb="0">
                  {t("br.override")}
                </FormLabel>
                <HopeSwitch
                  id="restore-override"
                  checked={override()}
                  onChange={(e: { currentTarget: HTMLInputElement }) =>
                    setOverride(e.currentTarget.checked)
                  }
                />
              </FormControl>
            </div>
          </div>

          <div
            class="ol-admin-card__foot"
            style={{ "justify-content": "flex-end" }}
          >
            <Button
              colorScheme="neutral"
              loading={restoreLoading()}
              onClick={() => {
                restore()
              }}
            >
              <TbUpload
                size={15}
                class="ol-ico"
                style={{ "margin-right": "6px" }}
              />
              {t("br.restore")}
            </Button>
          </div>
        </section>
      </div>

      {/* Monospace Log Stream */}
      <section class="ol-admin-card ol-admin-card--flush">
        <div class="ol-admin-card__head">
          <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
            <TbTerminal2 size={16} class="ol-ico" />
            <h2 class="ol-admin-card__title">{t("tasks.attr.status")}</h2>
            <span class="ol-pill ol-tabular">{log().length}</span>
          </div>
          <Show when={log().length > 0}>
            <Button size="xs" colorScheme="neutral" onClick={() => setLog([])}>
              <TbTrash
                size={13}
                class="ol-ico"
                style={{ "margin-right": "4px" }}
              />
              {t("global.clear")}
            </Button>
          </Show>
        </div>

        <div
          ref={logRef!}
          style={{
            "font-family": "var(--ol-font-mono)",
            "font-size": "12.5px",
            "line-height": "1.55",
            "min-height": "220px",
            "max-height": "50vh",
            "overflow-y": "auto",
            padding: "12px 18px",
            background: "var(--ol-surface-2)",
          }}
        >
          <Show
            when={log().length > 0}
            fallback={
              <div class="ol-admin-empty">
                <span>{t("manage.common.no_data")}</span>
              </div>
            }
          >
            <For each={log()}>{(item) => <Log {...item} />}</For>
          </Show>
        </div>
      </section>
    </div>
  )
}

function download(filename: string, data: any) {
  const file = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(file)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default BackupRestore
