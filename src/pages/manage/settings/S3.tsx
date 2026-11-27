import { Button } from "@hope-ui/solid"
import crypto from "crypto-js"
import { TbCheck, TbKey, TbRefresh } from "solid-icons/tb"
import { createSignal, Index, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { MaybeLoading } from "~/components"
import { useFetch, useManageTitle, useT } from "~/hooks"
import { setSettings as renewSettings } from "~/store"
import { EmptyResp, Group, PEmptyResp, PResp, Resp, SettingItem } from "~/types"
import {
  getTarget,
  handleResp,
  handleRespWithoutAuthAndNotify,
  notify,
  r,
} from "~/utils"
import { S3Bucket } from "./S3BucketItem"
import S3Buckets from "./S3Buckets"
import { Item } from "./SettingItem"
import { SettingsShell } from "./SettingsShell"

const bucket_parse = (settings: SettingItem[]): S3Bucket[] => {
  const found = settings.find((i) => i.key === "s3_buckets")
  if (!found || !found.value) return []
  try {
    return JSON.parse(found.value)
  } catch {
    return []
  }
}

const S3Settings = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.s3")
  const [settingsLoading, getSettings] = useFetch((): PResp<SettingItem[]> =>
    r.get(`/admin/setting/list?group=${Group.S3}`),
  )
  const [settings, setSettings] = createStore<SettingItem[]>([])
  const refresh = async () => {
    const resp = await getSettings()
    handleResp<SettingItem[]>(resp, setSettings)
  }
  refresh()

  const [saveLoading, saveSettings] = useFetch((): PEmptyResp =>
    r.post("/admin/setting/save", getTarget(settings)),
  )
  const [loading, setLoading] = createSignal(false)

  const generateKeys = () => {
    const awsAccessKeyId = crypto.lib.WordArray.random(120 / 8)
    const awsSecretAccessKey = crypto.lib.WordArray.random(240 / 8)
    const accessKeyId = crypto.enc.Base64.stringify(awsAccessKeyId).replace(
      /[\r\n]/g,
      "",
    )
    const secretAccessKey = crypto.enc.Base64.stringify(
      awsSecretAccessKey,
    ).replace(/[\r\n]/g, "")
    setSettings((i) => i.key === "s3_access_key_id", "value", accessKeyId)
    setSettings(
      (i) => i.key === "s3_secret_access_key",
      "value",
      secretAccessKey,
    )
  }

  return (
    <SettingsShell
      title={t("manage.sidemenu.s3")}
      subtitle={t("settings.s3_restart_to_apply")}
    >
      <MaybeLoading loading={settingsLoading() && settings.length === 0}>
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <div>
              <h2 class="ol-admin-card__title">{t("manage.sidemenu.s3")}</h2>
              <p class="ol-admin-card__subtitle">
                {t("settings.s3_restart_to_apply")}
              </p>
            </div>
            <Button size="sm" colorScheme="neutral" onClick={generateKeys}>
              <TbKey
                size={15}
                class="ol-ico"
                style={{ "margin-right": "6px" }}
              />
              {t("settings.s3_generate")}
            </Button>
          </div>

          <div class="ol-admin-form-grid">
            <Index each={settings}>
              {(item) => (
                <Show when={item().key !== "s3_buckets"}>
                  <Item
                    {...item()}
                    onChange={(val) => {
                      setSettings((i) => item().key === i.key, "value", val)
                    }}
                    onDelete={async () => {
                      setLoading(true)
                      const resp: EmptyResp = await r.post(
                        `/admin/setting/delete?key=${item().key}`,
                      )
                      setLoading(false)
                      handleResp(resp, () => {
                        notify.success(t("global.delete_success"))
                        refresh()
                      })
                    }}
                  />
                </Show>
              )}
            </Index>
          </div>
        </section>

        <S3Buckets buckets={bucket_parse(settings)} setSettings={setSettings} />
      </MaybeLoading>

      <div class="ol-sticky-actions">
        <Button
          colorScheme="neutral"
          onClick={refresh}
          loading={settingsLoading() || loading()}
        >
          <TbRefresh
            size={15}
            class="ol-ico"
            style={{ "margin-right": "6px" }}
          />
          {t("global.refresh")}
        </Button>
        <Button
          colorScheme="primary"
          loading={saveLoading()}
          onClick={async () => {
            const buckets = bucket_parse(settings)
            const names = new Set<string>()
            for (const bucket of buckets) {
              if (bucket.name === "" || bucket.path === "") {
                notify.error(t("settings.s3_buckets_empty"))
                return
              }
              if (names.has(bucket.name)) {
                notify.error(t("settings.s3_buckets_duplicate_name"))
                return
              }
              names.add(bucket.name)
            }
            const resp = await saveSettings()
            handleResp(resp, async () => {
              notify.success(t("global.save_success"))
              handleRespWithoutAuthAndNotify(
                (await r.get("/public/settings")) as Resp<
                  Record<string, string>
                >,
                renewSettings,
              )
            })
          }}
        >
          <TbCheck size={15} class="ol-ico" style={{ "margin-right": "6px" }} />
          {t("global.save")}
        </Button>
      </div>
    </SettingsShell>
  )
}

export default S3Settings
