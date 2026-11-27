import { Button } from "@hope-ui/solid"
import { TbCheck, TbRefresh, TbReplace, TbSearch, TbX } from "solid-icons/tb"
import {
  createEffect,
  createMemo,
  createSignal,
  Index,
  on,
  Show,
} from "solid-js"
import { createStore } from "solid-js/store"
import { MaybeLoading } from "~/components"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { setSettings as renewSettings } from "~/store"
import {
  EmptyResp,
  Group,
  PEmptyResp,
  PResp,
  Resp,
  SettingItem,
  Type,
} from "~/types"
import {
  getTarget,
  handleResp,
  handleRespWithoutAuthAndNotify,
  notify,
  r,
} from "~/utils"
import { Item } from "./SettingItem"
import { SettingsShell } from "./SettingsShell"

export interface CommonSettingsProps {
  group: Group
}

const CommonSettings = (props: CommonSettingsProps) => {
  const t = useT()
  const { pathname } = useRouter()
  const slug = createMemo(() => pathname().split("/").pop() || "site")
  useManageTitle(`manage.sidemenu.${slug()}`)

  const [settingsLoading, getSettings] = useFetch((): PResp<SettingItem[]> =>
    r.get(`/admin/setting/list?group=${props.group}`),
  )
  const [settings, setSettings] = createStore<SettingItem[]>([])
  const [query, setQuery] = createSignal("")

  const refresh = async () => {
    const resp = await getSettings()
    handleResp<SettingItem[]>(resp, setSettings)
  }

  createEffect(
    on(
      () => props.group,
      () => {
        setQuery("")
        refresh()
      },
    ),
  )

  const [saveLoading, saveSettings] = useFetch((): PEmptyResp =>
    r.post("/admin/setting/save", getTarget(settings)),
  )
  const [defaultLoading, defaultSettings] = useFetch((): PResp<SettingItem[]> =>
    r.post(`/admin/setting/default?group=${props.group}`),
  )
  const [loading, setLoading] = createSignal(false)

  const matchesSearch = (s: SettingItem): boolean => {
    const q = query().trim().toLowerCase()
    if (!q) return true
    const label = t(`settings.${s.key}`).toLowerCase()
    const tips = s.help ? t(`settings.${s.key}-tips`).toLowerCase() : ""
    return (
      s.key.toLowerCase().includes(q) || label.includes(q) || tips.includes(q)
    )
  }

  const matchedCount = createMemo(
    () => settings.filter((item) => matchesSearch(item)).length,
  )

  return (
    <SettingsShell title={t(`manage.sidemenu.${slug()}`)}>
      <div class="ol-admin-toolbar">
        <div class="ol-admin-toolbar__left">
          <div class="ol-admin-search">
            <TbSearch size={15} class="ol-ico" />
            <input
              type="search"
              value={query()}
              placeholder={t("manage.common.search")}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
          </div>
          <Show when={query().trim().length > 0}>
            <button
              type="button"
              class="ol-icon-btn"
              title={t("global.clear")}
              onClick={() => setQuery("")}
            >
              <TbX size={15} class="ol-ico" />
            </button>
          </Show>
        </div>
        <div class="ol-admin-toolbar__right">
          <span class="ol-pill ol-tabular">
            {matchedCount()} / {settings.length}
          </span>
        </div>
      </div>

      <MaybeLoading loading={settingsLoading() && settings.length === 0}>
        <section class="ol-admin-card">
          <Show
            when={matchedCount() > 0}
            fallback={
              <div class="ol-admin-empty">
                <span>
                  {settings.length === 0
                    ? t("manage.common.no_data")
                    : t("manage.common.no_results")}
                </span>
              </div>
            }
          >
            <div class="ol-admin-form-grid">
              <Index each={settings}>
                {(item) => (
                  <Show when={matchesSearch(item())}>
                    <div
                      style={
                        item().type === Type.Text
                          ? { "grid-column": "1 / -1" }
                          : undefined
                      }
                    >
                      <Item
                        {...item()}
                        hideLabel={item().key === "sign_bind_ip"}
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
                    </div>
                  </Show>
                )}
              </Index>
            </div>
          </Show>
        </section>
      </MaybeLoading>

      <div class="ol-sticky-actions">
        <Button
          colorScheme="neutral"
          onClick={refresh}
          loading={settingsLoading() || loading() || defaultLoading()}
        >
          <TbRefresh
            size={15}
            class="ol-ico"
            style={{ "margin-right": "6px" }}
          />
          {t("global.refresh")}
        </Button>
        <Button
          colorScheme="neutral"
          loading={settingsLoading() || loading() || defaultLoading()}
          onClick={async () => {
            const resp = await defaultSettings()
            handleResp(resp, (data) => {
              notify.info(t("manage.load_default_setting_success"))
              setSettings(data)
            })
          }}
        >
          <TbReplace
            size={15}
            class="ol-ico"
            style={{ "margin-right": "6px" }}
          />
          {t("manage.load_default_setting")}
        </Button>
        <Button
          colorScheme="primary"
          loading={saveLoading()}
          onClick={async () => {
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

export default CommonSettings
