import { Button, FormControl, FormLabel, Input } from "@hope-ui/solid"
import {
  TbArrowsLeftRight,
  TbCheck,
  TbCopy,
  TbDatabase,
  TbDownload,
  TbKey,
  TbMagnet,
  TbRefresh,
} from "solid-icons/tb"
import { createSignal } from "solid-js"
import { FolderChooseInput, MaybeLoading } from "~/components"
import { useFetch, useManageTitle, useT, useUtil } from "~/hooks"
import { Group, PResp, SettingItem, Type } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { Item } from "./SettingItem"
import { SettingsShell } from "./SettingsShell"

const OtherSettings = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.other")
  const [uri, setUri] = createSignal("")
  const [secret, setSecret] = createSignal("")
  const [qbitUrl, setQbitUrl] = createSignal("")
  const [pan123TempDir, set123TempDir] = createSignal("")
  const [qbitSeedTime, setQbitSeedTime] = createSignal("")
  const [transmissionUrl, setTransmissionUrl] = createSignal("")
  const [transmissionSeedTime, setTransmissionSeedTime] = createSignal("")
  const [pan115TempDir, set115TempDir] = createSignal("")
  const [pan115OpenTempDir, set115OpenTempDir] = createSignal("")
  const [pan123OpenTempDir, set123OpenTempDir] = createSignal("")
  const [pan123OpenCallbackUrl, set123OpenCallbackUrl] = createSignal("")
  const [pikpakTempDir, setPikPakTempDir] = createSignal("")
  const [thunderTempDir, setThunderTempDir] = createSignal("")
  const [thunderBrowserTempDir, setThunderBrowserTempDir] = createSignal("")
  const [thunderXTempDir, setThunderXTempDir] = createSignal("")
  const [guangYaPanTempDir, setGuangYaPanTempDir] = createSignal("")
  const [token, setToken] = createSignal("")
  const [settings, setSettings] = createSignal<SettingItem[]>([])

  const [settingsLoading, settingsData] = useFetch((): PResp<SettingItem[]> =>
    r.get(`/admin/setting/list?groups=${Group.ARIA2},${Group.SINGLE}`),
  )
  const [setAria2Loading, setAria2] = useFetch((): PResp<string> =>
    r.post("/admin/setting/set_aria2", { uri: uri(), secret: secret() }),
  )
  const [setQbitLoading, setQbit] = useFetch((): PResp<string> =>
    r.post("/admin/setting/set_qbit", {
      url: qbitUrl(),
      seedtime: qbitSeedTime(),
    }),
  )
  const [setTransmissionLoading, setTransmission] = useFetch(
    (): PResp<string> =>
      r.post("/admin/setting/set_transmission", {
        uri: transmissionUrl(),
        seedtime: transmissionSeedTime(),
      }),
  )
  const [set123PanLoading, set123Pan] = useFetch((): PResp<string> =>
    r.post("/admin/setting/set_123_pan", {
      temp_dir: pan123TempDir(),
    }),
  )
  const [set115Loading, set115] = useFetch((): PResp<string> =>
    r.post("/admin/setting/set_115", {
      temp_dir: pan115TempDir(),
    }),
  )
  const [set115OpenLoading, set115Open] = useFetch((): PResp<string> =>
    r.post("/admin/setting/set_115_open", {
      temp_dir: pan115OpenTempDir(),
    }),
  )
  const [set123OpenLoading, set123Open] = useFetch((): PResp<string> =>
    r.post("/admin/setting/set_123_open", {
      temp_dir: pan123OpenTempDir(),
      callback_url: pan123OpenCallbackUrl(),
    }),
  )
  const [setPikPakLoading, setPikPak] = useFetch((): PResp<string> =>
    r.post("/admin/setting/set_pikpak", {
      temp_dir: pikpakTempDir(),
    }),
  )
  const [setThunderLoading, setThunder] = useFetch((): PResp<string> =>
    r.post("/admin/setting/set_thunder", {
      temp_dir: thunderTempDir(),
    }),
  )
  const [setThunderXLoading, setThunderX] = useFetch((): PResp<string> =>
    r.post("/admin/setting/set_thunderx", {
      temp_dir: thunderXTempDir(),
    }),
  )
  const [setThunderBrowserLoading, setThunderBrowser] = useFetch(
    (): PResp<string> =>
      r.post("/admin/setting/set_thunder_browser", {
        temp_dir: thunderBrowserTempDir(),
      }),
  )
  const [setGuangYaPanLoading, setGuangYaPan] = useFetch((): PResp<string> =>
    r.post("/admin/setting/set_guangyapan", {
      temp_dir: guangYaPanTempDir(),
    }),
  )

  const refresh = async () => {
    const resp = await settingsData()
    handleResp(resp, (data) => {
      setUri(data.find((i) => i.key === "aria2_uri")?.value || "")
      setSecret(data.find((i) => i.key === "aria2_secret")?.value || "")
      setToken(data.find((i) => i.key === "token")?.value || "")
      setQbitUrl(data.find((i) => i.key === "qbittorrent_url")?.value || "")
      set123TempDir(data.find((i) => i.key === "123_pan_temp_dir")?.value || "")
      setQbitSeedTime(
        data.find((i) => i.key === "qbittorrent_seedtime")?.value || "",
      )
      setTransmissionUrl(
        data.find((i) => i.key === "transmission_uri")?.value || "",
      )
      setTransmissionSeedTime(
        data.find((i) => i.key === "transmission_seedtime")?.value || "",
      )
      set115TempDir(data.find((i) => i.key === "115_temp_dir")?.value || "")
      set115OpenTempDir(
        data.find((i) => i.key === "115_open_temp_dir")?.value || "",
      )
      set123OpenTempDir(
        data.find((i) => i.key === "123_open_temp_dir")?.value || "",
      )
      set123OpenCallbackUrl(
        data.find((i) => i.key === "123_open_callback_url")?.value || "",
      )
      setPikPakTempDir(
        data.find((i) => i.key === "pikpak_temp_dir")?.value || "",
      )
      setThunderTempDir(
        data.find((i) => i.key === "thunder_temp_dir")?.value || "",
      )
      setThunderXTempDir(
        data.find((i) => i.key === "thunderx_temp_dir")?.value || "",
      )
      setThunderBrowserTempDir(
        data.find((i) => i.key === "thunder_browser_temp_dir")?.value || "",
      )
      setGuangYaPanTempDir(
        data.find((i) => i.key === "guangyapan_temp_dir")?.value || "",
      )
      setSettings(data)
    })
  }
  refresh()

  const [resetTokenLoading, resetToken] = useFetch((): PResp<string> =>
    r.post("/admin/setting/reset_token"),
  )
  const { copy } = useUtil()

  const findSetting = (key: string): SettingItem =>
    settings().find((i) => i.key === key) ?? {
      key,
      value: "",
      type: Type.String,
      help: "",
      options: "",
      flag: 0,
      group: Group.SINGLE,
    }

  const tempDirCards = [
    {
      id: "115_temp_dir",
      titleKey: "settings_other.115",
      labelKey: "settings_other.115_temp_dir",
      value: pan115TempDir,
      onChange: set115TempDir,
      loading: set115Loading,
      save: set115,
    },
    {
      id: "115_open_temp_dir",
      titleKey: "settings_other.115_open",
      labelKey: "settings_other.115_open_temp_dir",
      value: pan115OpenTempDir,
      onChange: set115OpenTempDir,
      loading: set115OpenLoading,
      save: set115Open,
    },
    {
      id: "123_temp_dir",
      titleKey: "settings_other.123_pan",
      labelKey: "settings_other.123_temp_dir",
      value: pan123TempDir,
      onChange: set123TempDir,
      loading: set123PanLoading,
      save: set123Pan,
    },
    {
      id: "pikpak_temp_dir",
      titleKey: "settings_other.pikpak",
      labelKey: "settings_other.pikpak_temp_dir",
      value: pikpakTempDir,
      onChange: setPikPakTempDir,
      loading: setPikPakLoading,
      save: setPikPak,
    },
    {
      id: "thunder_temp_dir",
      titleKey: "settings_other.thunder",
      labelKey: "settings_other.thunder_temp_dir",
      value: thunderTempDir,
      onChange: setThunderTempDir,
      loading: setThunderLoading,
      save: setThunder,
    },
    {
      id: "thunder_browser_temp_dir",
      titleKey: "settings_other.thunder_browser",
      labelKey: "settings_other.thunder_browser_temp_dir",
      value: thunderBrowserTempDir,
      onChange: setThunderBrowserTempDir,
      loading: setThunderBrowserLoading,
      save: setThunderBrowser,
    },
    {
      id: "thunderX_temp_dir",
      titleKey: "settings_other.thunderx",
      labelKey: "settings_other.thunderX_temp_dir",
      value: thunderXTempDir,
      onChange: setThunderXTempDir,
      loading: setThunderXLoading,
      save: setThunderX,
    },
    {
      id: "guangyapan_temp_dir",
      titleKey: "settings_other.guangyapan",
      labelKey: "settings_other.guangyapan_temp_dir",
      value: guangYaPanTempDir,
      onChange: setGuangYaPanTempDir,
      loading: setGuangYaPanLoading,
      save: setGuangYaPan,
    },
  ]

  return (
    <SettingsShell
      title={t("manage.sidemenu.other")}
      actions={
        <Button
          colorScheme="neutral"
          size="sm"
          loading={settingsLoading()}
          onClick={refresh}
        >
          <TbRefresh
            size={15}
            class="ol-ico"
            style={{ "margin-right": "6px" }}
          />
          {t("global.refresh")}
        </Button>
      }
    >
      <MaybeLoading loading={settingsLoading() && settings().length === 0}>
        {/* API Token Card */}
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <div
              style={{ display: "flex", "align-items": "center", gap: "8px" }}
            >
              <TbKey size={17} class="ol-ico" />
              <h2 class="ol-admin-card__title">{t("settings.token")}</h2>
            </div>
            <div
              style={{ display: "flex", "align-items": "center", gap: "8px" }}
            >
              <Button
                size="sm"
                colorScheme="neutral"
                onClick={() => {
                  copy(token())
                }}
              >
                <TbCopy
                  size={14}
                  class="ol-ico"
                  style={{ "margin-right": "5px" }}
                />
                {t("settings_other.copy_token")}
              </Button>
              <Button
                size="sm"
                colorScheme="danger"
                loading={resetTokenLoading()}
                onClick={async () => {
                  const resp = await resetToken()
                  handleResp(resp, (data) => {
                    notify.success(t("settings_other.reset_token_success"))
                    setToken(data)
                  })
                }}
              >
                <TbRefresh
                  size={14}
                  class="ol-ico"
                  style={{ "margin-right": "5px" }}
                />
                {t("settings_other.reset_token")}
              </Button>
            </div>
          </div>
          <Input
            value={token()}
            readOnly
            style={{ "font-family": "var(--ol-font-mono)" }}
          />
        </section>

        {/* Download Clients */}
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <div
              style={{ display: "flex", "align-items": "center", gap: "8px" }}
            >
              <TbDownload size={17} class="ol-ico" />
              <h2 class="ol-admin-card__title">{t("settings_other.aria2")}</h2>
            </div>
            <Button
              size="sm"
              colorScheme="primary"
              loading={setAria2Loading()}
              onClick={async () => {
                const resp = await setAria2()
                handleResp(resp, (data) => {
                  notify.success(`${t("settings_other.aria2_version")} ${data}`)
                })
              }}
            >
              <TbCheck
                size={14}
                class="ol-ico"
                style={{ "margin-right": "5px" }}
              />
              {t("global.save")}
            </Button>
          </div>
          <div class="ol-admin-form-grid">
            <Item
              {...findSetting("aria2_uri")}
              value={uri()}
              onChange={(str) => setUri(str)}
            />
            <Item
              {...findSetting("aria2_secret")}
              value={secret()}
              onChange={(str) => setSecret(str)}
            />
          </div>
        </section>

        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <div
              style={{ display: "flex", "align-items": "center", gap: "8px" }}
            >
              <TbMagnet size={17} class="ol-ico" />
              <h2 class="ol-admin-card__title">
                {t("settings_other.qbittorrent")}
              </h2>
            </div>
            <Button
              size="sm"
              colorScheme="primary"
              loading={setQbitLoading()}
              onClick={async () => {
                const resp = await setQbit()
                handleResp(resp, (data) => {
                  notify.success(data)
                })
              }}
            >
              <TbCheck
                size={14}
                class="ol-ico"
                style={{ "margin-right": "5px" }}
              />
              {t("global.save")}
            </Button>
          </div>
          <div class="ol-admin-form-grid">
            <Item
              {...findSetting("qbittorrent_url")}
              value={qbitUrl()}
              onChange={(str) => setQbitUrl(str)}
            />
            <Item
              {...findSetting("qbittorrent_seedtime")}
              value={qbitSeedTime()}
              onChange={(str) => setQbitSeedTime(str)}
            />
          </div>
        </section>

        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <div
              style={{ display: "flex", "align-items": "center", gap: "8px" }}
            >
              <TbArrowsLeftRight size={17} class="ol-ico" />
              <h2 class="ol-admin-card__title">
                {t("settings_other.transmission")}
              </h2>
            </div>
            <Button
              size="sm"
              colorScheme="primary"
              loading={setTransmissionLoading()}
              onClick={async () => {
                const resp = await setTransmission()
                handleResp(resp, (data) => {
                  notify.success(data)
                })
              }}
            >
              <TbCheck
                size={14}
                class="ol-ico"
                style={{ "margin-right": "5px" }}
              />
              {t("global.save")}
            </Button>
          </div>
          <div class="ol-admin-form-grid">
            <Item
              {...findSetting("transmission_uri")}
              value={transmissionUrl()}
              onChange={(str) => setTransmissionUrl(str)}
            />
            <Item
              {...findSetting("transmission_seedtime")}
              value={transmissionSeedTime()}
              onChange={(str) => setTransmissionSeedTime(str)}
            />
          </div>
        </section>

        {/* 123 Open (2 fields) */}
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <div
              style={{ display: "flex", "align-items": "center", gap: "8px" }}
            >
              <TbDatabase size={17} class="ol-ico" />
              <h2 class="ol-admin-card__title">
                {t("settings_other.123_open")}
              </h2>
            </div>
            <Button
              size="sm"
              colorScheme="primary"
              loading={set123OpenLoading()}
              onClick={async () => {
                const resp = await set123Open()
                handleResp(resp, (data) => {
                  notify.success(data)
                })
              }}
            >
              <TbCheck
                size={14}
                class="ol-ico"
                style={{ "margin-right": "5px" }}
              />
              {t("global.save")}
            </Button>
          </div>
          <div class="ol-admin-form-grid">
            <FormControl w="100%" display="flex" flexDirection="column">
              <FormLabel for="123_open_temp_dir">
                {t("settings_other.123_open_temp_dir")}
              </FormLabel>
              <FolderChooseInput
                id="123_open_temp_dir"
                value={pan123OpenTempDir()}
                onChange={(path) => set123OpenTempDir(path)}
              />
            </FormControl>
            <FormControl w="100%" display="flex" flexDirection="column">
              <FormLabel for="123_open_callback_url">
                {t("settings_other.123_open_callback_url")}
              </FormLabel>
              <Input
                id="123_open_callback_url"
                value={pan123OpenCallbackUrl()}
                onInput={(e) => set123OpenCallbackUrl(e.currentTarget.value)}
              />
            </FormControl>
          </div>
        </section>

        {/* Cloud Storage Temp Directories Grid */}
        <div class="ol-admin-grid">
          {tempDirCards.map((card) => (
            <section class="ol-admin-card">
              <div class="ol-admin-card__head">
                <div
                  style={{
                    display: "flex",
                    "align-items": "center",
                    gap: "8px",
                  }}
                >
                  <TbDatabase size={16} class="ol-ico" />
                  <h2 class="ol-admin-card__title">{t(card.titleKey)}</h2>
                </div>
                <Button
                  size="sm"
                  colorScheme="primary"
                  loading={card.loading()}
                  onClick={async () => {
                    const resp = await card.save()
                    handleResp(resp, (data) => {
                      notify.success(data)
                    })
                  }}
                >
                  <TbCheck
                    size={14}
                    class="ol-ico"
                    style={{ "margin-right": "5px" }}
                  />
                  {t("global.save")}
                </Button>
              </div>
              <FormControl w="100%" display="flex" flexDirection="column">
                <FormLabel for={card.id}>{t(card.labelKey)}</FormLabel>
                <FolderChooseInput
                  id={card.id}
                  value={card.value()}
                  onChange={(path) => card.onChange(path)}
                />
              </FormControl>
            </section>
          ))}
        </div>
      </MaybeLoading>
    </SettingsShell>
  )
}

export default OtherSettings
