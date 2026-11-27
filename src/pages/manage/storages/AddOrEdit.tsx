import {
  TbAlertTriangle,
  TbArrowLeft,
  TbCheck,
  TbDownload,
  TbInfoCircle,
  TbUpload,
} from "solid-icons/tb"
import { createMemo, createSignal, For, Show } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { MaybeLoading, ModalInput } from "~/components"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import {
  Addition,
  DriverConfig,
  DriverItem,
  PResp,
  Storage,
  Type,
} from "~/types"
import { handleResp, joinBase, notify, r } from "~/utils"
import { ASMRONESyncPanel, useASMRONETranslation } from "./ASMRONESyncPanel"
import { Item } from "./Item"
import { JMComicSyncPanel, useJMComicTranslation } from "./JMComicSyncPanel"

interface DriverInfo {
  common: DriverItem[]
  additional: DriverItem[]
  config: DriverConfig
}

function GetDefaultValue(type: Type, value?: string) {
  switch (type) {
    case Type.Bool:
      if (value) {
        return value === "true"
      }
      return false
    case Type.Number:
      if (value) {
        return parseInt(value)
      }
      return 0
    case Type.Float:
      if (value) {
        return parseFloat(value)
      }
      return 0
    default:
      if (value) {
        return value
      }
      return ""
  }
}

type Drivers = Record<string, DriverInfo>

const normalizeProxy = (storage: Storage): Storage => ({
  ...storage,
  api_proxy_mode: storage.api_proxy_mode || "system",
  api_proxy_url: storage.api_proxy_url ?? "",
  transfer_proxy_mode: storage.transfer_proxy_mode || "system",
  transfer_proxy_url: storage.transfer_proxy_url ?? "",
})

const AddOrEdit = () => {
  const asmroneT = useASMRONETranslation()
  const jmcomicT = useJMComicTranslation()
  const t = useT()
  const { params, to } = useRouter()
  const { id } = params
  useManageTitle(`global.${id ? "edit" : "add"}`)

  const [driversLoading, loadDrivers] = useFetch(
    (): PResp<Drivers> => r.get("/admin/driver/list"),
    true,
  )
  const [drivers, setDrivers] = createSignal<Drivers>({})
  const initAdd = async () => {
    const resp = await loadDrivers()
    handleResp(resp, setDrivers)
  }

  const [storageLoading, loadStorage] = useFetch(
    (): PResp<Storage> => r.get(`/admin/storage/get?id=${id}`),
    true,
  )
  const [driverLoading, loadDriver] = useFetch(
    (): PResp<DriverInfo> =>
      r.get(`/admin/driver/info?driver=${storage.driver}`),
    true,
  )
  const initEdit = async () => {
    const storageResp = await loadStorage()
    handleResp(storageResp, async (storageData) => {
      setStorage(normalizeProxy(storageData))
      setAddition(JSON.parse(storageData.addition))
      const driverResp = await loadDriver()
      handleResp(driverResp, (driverData) =>
        setDrivers({ [storage.driver]: driverData }),
      )
    })
  }
  if (id) {
    initEdit()
  } else {
    initAdd()
  }

  const [storage, setStorage] = createStore<Storage>({} as Storage)
  const [addition, setAddition] = createStore<Addition>({})
  const [okLoading, ok] = useFetch((): PResp<{ id: number }> => {
    setStorage("addition", JSON.stringify(addition))
    return r.post(`/admin/storage/${id ? "update" : "create"}`, storage)
  })

  const alert = createMemo(() => {
    const i = drivers()[storage.driver]?.config.alert
    if (i) {
      return i.split("|")[0]
    }
  })

  const [exportOpened, setExportOpened] = createSignal(false)
  const [importOpened, setImportOpened] = createSignal(false)

  const handleSave = async () => {
    if (!storage.driver || !drivers()[storage.driver]) {
      return
    }
    if (
      (storage.api_proxy_mode === "manual" && !storage.api_proxy_url?.trim()) ||
      (storage.transfer_proxy_mode === "manual" &&
        !storage.transfer_proxy_url?.trim())
    ) {
      notify.error(t("storages.common.proxy_url_required"))
      return
    }
    if (drivers()[storage.driver].config.need_ms) {
      notify.info(t("manage.add_storage-tips"))
      window.open(joinBase("/@manage/messenger"), "_blank")
    }
    const resp = await ok()
    handleResp(
      resp,
      () => {
        notify.success(t("global.save_success"))
        to("/@manage/storages", false, { replace: true })
      },
      () => {
        if (resp.data?.id) {
          to(`/@manage/storages/edit/${resp.data.id}`)
        }
      },
    )
  }

  return (
    <MaybeLoading
      loading={id ? storageLoading() || driverLoading() : driversLoading()}
    >
      <div class="ol-admin-page">
        <div class="ol-admin-head">
          <div class="ol-admin-head__main">
            <h1 class="ol-admin-title">
              {t(`global.${id ? "edit" : "add"}`)} —{" "}
              {t("manage.sidemenu.storages")}
            </h1>
            <Show when={storage.mount_path}>
              <p
                class="ol-admin-subtitle"
                style={{ "font-family": "var(--ol-font-mono)" }}
              >
                {storage.mount_path}
              </p>
            </Show>
          </div>

          <div class="ol-admin-head__actions">
            <button
              type="button"
              class="ol-btn ol-btn--ghost"
              onClick={() => to("/@manage/storages")}
            >
              <TbArrowLeft size={15} class="ol-ico" />
              <span>{t("global.back")}</span>
            </button>
            <button
              type="button"
              class="ol-btn"
              disabled={okLoading()}
              onClick={() => setImportOpened(true)}
            >
              <TbUpload size={15} class="ol-ico" />
              <span>{t("storages.common.import")}</span>
            </button>
            <button
              type="button"
              class="ol-btn"
              disabled={okLoading()}
              onClick={() => setExportOpened(true)}
            >
              <TbDownload size={15} class="ol-ico" />
              <span>{t("storages.common.export")}</span>
            </button>
          </div>
        </div>

        <section class="ol-admin-card">
          <div class="ol-admin-form-stack">
            <Item
              name="driver"
              default=""
              readonly={id !== undefined}
              required
              searchable
              type={Type.Select}
              options={id ? storage.driver : Object.keys(drivers()).join(",")}
              value={storage.driver}
              full_name_path="storages.common.driver"
              options_prefix="drivers.drivers"
              driver="drivers"
              onChange={(value) => {
                for (const item of drivers()[value].common) {
                  setStorage(
                    item.name as keyof Storage,
                    GetDefaultValue(item.type, item.default) as any,
                  )
                }
                setAddition(
                  produce((addition) => {
                    for (const key in addition) {
                      delete addition[key]
                    }
                  }),
                )
                for (const item of drivers()[value].additional) {
                  setAddition(
                    item.name,
                    GetDefaultValue(item.type, item.default) as any,
                  )
                }
                setStorage("driver", value)
                if (value === "ASMR.ONE") {
                  setStorage("mount_path", "/ASMR_DLSite")
                }
                if (value === "JMComic") {
                  setStorage("mount_path", "/JMComic")
                }
              }}
            />

            <Show when={alert()}>
              {(kind) => {
                const isDanger = () => kind() === "danger" || kind() === "error"
                const isWarn = () => kind() === "warning"
                return (
                  <div
                    role="note"
                    style={{
                      display: "flex",
                      "align-items": "flex-start",
                      gap: "10px",
                      padding: "10px 14px",
                      "border-radius": "var(--ol-radius-sm)",
                      border: "1px solid var(--ol-border)",
                      background: isDanger()
                        ? "var(--ol-danger-soft)"
                        : isWarn()
                          ? "var(--ol-warn-soft)"
                          : "var(--ol-surface-2)",
                      color: isDanger()
                        ? "var(--ol-danger)"
                        : isWarn()
                          ? "var(--ol-warn)"
                          : "var(--ol-text-secondary)",
                      "font-size": "13px",
                      "line-height": "1.5",
                    }}
                  >
                    {isDanger() || isWarn() ? (
                      <TbAlertTriangle
                        size={17}
                        class="ol-ico"
                        style={{ "margin-top": "2px" }}
                      />
                    ) : (
                      <TbInfoCircle
                        size={17}
                        class="ol-ico"
                        style={{ "margin-top": "2px" }}
                      />
                    )}
                    <span>{t(`drivers.config.${storage.driver}.alert`)}</span>
                  </div>
                )
              }}
            </Show>
          </div>
        </section>

        <Show when={id && storage.driver === "ASMR.ONE"}>
          <ASMRONESyncPanel
            storageId={Number(id)}
            disabled={storage.disabled}
          />
        </Show>
        <Show when={id && storage.driver === "JMComic"}>
          <JMComicSyncPanel
            storageId={Number(id)}
            disabled={storage.disabled}
          />
        </Show>

        <Show when={drivers()[storage.driver]}>
          <Show when={drivers()[storage.driver].common.length > 0}>
            <section class="ol-admin-card">
              <div class="ol-admin-card__head">
                <h2 class="ol-admin-card__title">
                  {t("manage.sidemenu.global")}
                </h2>
              </div>
              <div class="ol-admin-form-grid">
                <For each={drivers()[storage.driver].common}>
                  {(item) => (
                    <Show
                      when={
                        (item.name !== "api_proxy_url" ||
                          storage.api_proxy_mode === "manual") &&
                        (item.name !== "transfer_proxy_url" ||
                          storage.transfer_proxy_mode === "manual")
                      }
                    >
                      <Item
                        {...item}
                        type={item.type as any}
                        required={
                          item.required ||
                          item.name === "api_proxy_url" ||
                          item.name === "transfer_proxy_url"
                        }
                        driver="common"
                        value={(storage as any)[item.name]}
                        onChange={(val: any) => {
                          setStorage(item.name as keyof Storage, val)
                        }}
                      />
                    </Show>
                  )}
                </For>
              </div>
            </section>
          </Show>

          <Show when={drivers()[storage.driver].additional.length > 0}>
            <section class="ol-admin-card">
              <div class="ol-admin-card__head">
                <h2 class="ol-admin-card__title">
                  {t(
                    `drivers.drivers.${storage.driver}`,
                    undefined,
                    storage.driver,
                  )}
                </h2>
              </div>
              <div class="ol-admin-form-grid">
                <For each={drivers()[storage.driver].additional}>
                  {(item) => (
                    <Item
                      {...item}
                      type={item.type as any}
                      driver={storage.driver}
                      label={
                        storage.driver === "ASMR.ONE"
                          ? asmroneT(item.name)
                          : storage.driver === "JMComic"
                            ? jmcomicT(item.name)
                            : undefined
                      }
                      option_labels={
                        storage.driver === "JMComic" && item.name === "mode"
                          ? {
                              client: jmcomicT("client"),
                              server: jmcomicT("server"),
                            }
                          : undefined
                      }
                      value={addition[item.name] as any}
                      onChange={(val: any) => {
                        setAddition(item.name, val)
                      }}
                    />
                  )}
                </For>
              </div>
            </section>
          </Show>
        </Show>

        <div class="ol-sticky-actions">
          <button
            type="button"
            class="ol-btn"
            disabled={okLoading()}
            onClick={() => to("/@manage/storages")}
          >
            <span>{t("global.cancel")}</span>
          </button>
          <button
            type="button"
            class="ol-btn"
            disabled={okLoading()}
            onClick={() => setExportOpened(true)}
          >
            <TbDownload size={15} class="ol-ico" />
            <span>{t("storages.common.export")}</span>
          </button>
          <button
            type="button"
            class="ol-btn"
            disabled={okLoading()}
            onClick={() => setImportOpened(true)}
          >
            <TbUpload size={15} class="ol-ico" />
            <span>{t("storages.common.import")}</span>
          </button>
          <button
            type="button"
            class="ol-btn ol-btn--primary"
            disabled={okLoading() || !storage.driver}
            onClick={handleSave}
          >
            <TbCheck size={15} class="ol-ico" />
            <span>{t(`global.${id ? "save" : "add"}`)}</span>
          </button>
        </div>

        <Show when={exportOpened()}>
          <ModalInput
            opened={exportOpened()}
            onClose={() => setExportOpened(false)}
            title={t("storages.common.export_title")}
            type="text"
            tips={t("storages.common.export_tips")}
            defaultValue={JSON.stringify({
              ...storage,
              addition: JSON.stringify(addition),
            })}
            onSubmit={() => {
              setExportOpened(false)
            }}
          />
        </Show>
        <ModalInput
          opened={importOpened()}
          onClose={() => setImportOpened(false)}
          title={t("storages.common.import_title")}
          type="text"
          tips={t("storages.common.import_tips")}
          onSubmit={(text: string) => {
            try {
              const { id, disabled, modified, status, ...obj }: Storage =
                JSON.parse(text)
              setStorage(normalizeProxy(obj as Storage))
              setAddition(JSON.parse(obj.addition))
              setImportOpened(false)
              notify.success(t("storages.common.import_success"))
            } catch (e: any) {
              notify.error(`Invalid storage format: ${e.message}`)
            }
          }}
        />
      </div>
    </MaybeLoading>
  )
}

export default AddOrEdit
