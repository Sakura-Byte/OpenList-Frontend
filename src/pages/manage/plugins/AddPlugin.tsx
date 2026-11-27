import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Switch as HopeSwitch,
} from "@hope-ui/solid"
import { TbArrowLeft, TbCloudUpload, TbPlus, TbPuzzle } from "solid-icons/tb"
import { createSignal, Show } from "solid-js"
import { useManageTitle, useRouter, useT } from "~/hooks"
import { PluginItem, Resp } from "~/types"
import { handleResp, notify, parsePluginZip, pluginEngine, r } from "~/utils"

const AddPlugin = () => {
  const t = useT()
  const { back, to } = useRouter()
  useManageTitle("plugins.actions.install")

  const [loading, setLoading] = createSignal(false)
  const [installMethod, setInstallMethod] = createSignal<"zip" | "url">("zip")

  const [zipFile, setZipFile] = createSignal<File | null>(null)
  const [zipParsedManifest, setZipParsedManifest] =
    createSignal<Partial<PluginItem> | null>(null)
  const [isDragging, setIsDragging] = createSignal(false)

  const [manifestUrl, setManifestUrl] = createSignal("")
  const [highPrivilege, setHighPrivilege] = createSignal(false)

  const handleFileChange = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      notify.error("Please select a .zip plugin archive")
      return
    }
    setZipFile(file)
    setLoading(true)
    try {
      const extracted = await parsePluginZip(file)
      setZipParsedManifest(extracted.manifest)
      if (extracted.manifest.high_privilege) {
        setHighPrivilege(true)
      }
      notify.success("ZIP plugin package parsed successfully")
    } catch (err: any) {
      notify.error("ZIP parse failed: " + err.message)
      setZipFile(null)
      setZipParsedManifest(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async () => {
    setLoading(true)
    try {
      if (installMethod() === "zip") {
        const manifest = zipParsedManifest()
        if (!manifest || !manifest.id) {
          notify.warning("Please upload a valid plugin ZIP file first")
          return
        }
        const resp: Resp<PluginItem> = await r.post("/admin/plugin/install", {
          ...manifest,
          high_privilege: highPrivilege(),
          enabled: true,
        })
        handleResp(resp, (installed) => {
          if (installed.enabled) {
            pluginEngine.loadPlugin(installed)
          }
          notify.success(t("global.add") + " " + t("global.success"))
          to("/@manage/plugins")
        })
      } else {
        const url = manifestUrl().trim()
        if (!url) {
          notify.warning("Please enter the plugin manifest URL")
          return
        }
        const resp: Resp<PluginItem> = await r.post("/admin/plugin/install", {
          manifest_url: url,
          high_privilege: highPrivilege(),
        })
        handleResp(resp, (installed) => {
          if (installed.enabled) {
            pluginEngine.loadPlugin(installed)
          }
          notify.success(t("global.add") + " " + t("global.success"))
          to("/@manage/plugins")
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("plugins.actions.install")}</h1>
        </div>
        <div class="ol-admin-head__actions">
          <Button size="sm" colorScheme="neutral" onClick={() => back()}>
            <TbArrowLeft
              size={15}
              class="ol-ico"
              style={{ "margin-right": "6px" }}
            />
            {t("global.back")}
          </Button>
        </div>
      </div>

      {/* Installation Method Tabs */}
      <div class="ol-admin-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="ol-admin-tab"
          data-active={installMethod() === "zip" ? "true" : "false"}
          aria-selected={installMethod() === "zip" ? "true" : "false"}
          onClick={() => setInstallMethod("zip")}
        >
          <span>{t("plugins.install_modal.zip_tab")}</span>
        </button>
        <button
          type="button"
          role="tab"
          class="ol-admin-tab"
          data-active={installMethod() === "url" ? "true" : "false"}
          aria-selected={installMethod() === "url" ? "true" : "false"}
          onClick={() => setInstallMethod("url")}
        >
          <span>{t("plugins.install_modal.url_tab")}</span>
        </button>
      </div>

      <section class="ol-admin-card">
        <div class="ol-admin-form-stack">
          <Show
            when={installMethod() === "zip"}
            fallback={
              <FormControl
                w="100%"
                display="flex"
                flexDirection="column"
                required
              >
                <FormLabel for="manifest_url">
                  {t("plugins.install_modal.url_label")}
                </FormLabel>
                <Input
                  id="manifest_url"
                  placeholder={t("plugins.install_modal.url_placeholder")}
                  value={manifestUrl()}
                  onInput={(e: any) => setManifestUrl(e.target.value)}
                />
                <FormHelperText>
                  {t("plugins.install_modal.url_help")}
                </FormHelperText>
              </FormControl>
            }
          >
            <FormControl
              w="100%"
              display="flex"
              flexDirection="column"
              required
            >
              <FormLabel>{t("plugins.install_modal.zip_file_label")}</FormLabel>
              <div
                style={{
                  width: "100%",
                  padding: "28px 20px",
                  "border-radius": "var(--ol-radius-md)",
                  border: `1.5px dashed ${
                    isDragging()
                      ? "var(--ol-accent)"
                      : "var(--ol-border-strong)"
                  }`,
                  background: isDragging()
                    ? "var(--ol-accent-soft)"
                    : "var(--ol-surface-2)",
                  "text-align": "center",
                  cursor: "pointer",
                  transition:
                    "border-color 0.15s ease, background-color 0.15s ease",
                }}
                onDragOver={(e: DragEvent) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e: DragEvent) => {
                  e.preventDefault()
                  setIsDragging(false)
                  if (e.dataTransfer?.files?.[0]) {
                    handleFileChange(e.dataTransfer.files[0])
                  }
                }}
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = ".zip"
                  input.onchange = (e: any) => {
                    if (e.target.files?.[0]) {
                      handleFileChange(e.target.files[0])
                    }
                  }
                  input.click()
                }}
              >
                <div
                  style={{
                    display: "flex",
                    "flex-direction": "column",
                    "align-items": "center",
                    gap: "8px",
                  }}
                >
                  <TbCloudUpload
                    size={28}
                    class="ol-ico"
                    style={{ color: "var(--ol-accent-text)" }}
                  />
                  <div
                    style={{
                      "font-weight": "560",
                      "font-size": "13.5px",
                      color: "var(--ol-text-primary)",
                    }}
                  >
                    {zipFile()
                      ? zipFile()?.name
                      : t("plugins.install_modal.zip_drop_title")}
                  </div>
                  <div
                    style={{
                      "font-size": "12px",
                      color: "var(--ol-text-muted)",
                    }}
                  >
                    {t("plugins.install_modal.zip_drop_help")}
                  </div>
                </div>
              </div>
            </FormControl>

            <Show when={zipParsedManifest()}>
              <div
                class="ol-admin-card"
                style={{
                  background: "var(--ol-surface-2)",
                  padding: "14px 16px",
                  display: "flex",
                  "align-items": "center",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    display: "inline-grid",
                    "place-items": "center",
                    width: "36px",
                    height: "36px",
                    "border-radius": "var(--ol-radius-sm)",
                    background: "var(--ol-surface-card)",
                    border: "1px solid var(--ol-border)",
                    color: "var(--ol-accent-text)",
                    flex: "none",
                    overflow: "hidden",
                  }}
                >
                  <Show
                    when={zipParsedManifest()?.icon}
                    fallback={<TbPuzzle size={18} class="ol-ico" />}
                  >
                    <img
                      src={zipParsedManifest()?.icon}
                      alt=""
                      style={{
                        width: "22px",
                        height: "22px",
                        "object-fit": "contain",
                      }}
                    />
                  </Show>
                </span>
                <div style={{ flex: "1", "min-width": "0" }}>
                  <div
                    style={{
                      display: "flex",
                      "align-items": "center",
                      "flex-wrap": "wrap",
                      gap: "8px",
                    }}
                  >
                    <span style={{ "font-weight": "600", "font-size": "14px" }}>
                      {zipParsedManifest()?.name}
                    </span>
                    <span class="ol-pill ol-tabular" data-tone="accent">
                      v{zipParsedManifest()?.version}
                    </span>
                    <span
                      class="ol-pill"
                      style={{ "font-family": "var(--ol-font-mono)" }}
                    >
                      {zipParsedManifest()?.id}
                    </span>
                  </div>
                  <div
                    style={{
                      "margin-top": "3px",
                      "font-size": "12.5px",
                      color: "var(--ol-text-secondary)",
                    }}
                  >
                    {zipParsedManifest()?.description ||
                      "ZIP plugin package parsed successfully"}
                  </div>
                </div>
              </div>
            </Show>
          </Show>

          <FormControl w="100%" display="flex" flexDirection="column">
            <FormLabel for="high_privilege">
              {t("plugins.install_modal.high_privilege_label")}
            </FormLabel>
            <div
              style={{ display: "flex", "align-items": "center", gap: "8px" }}
            >
              <HopeSwitch
                id="high_privilege"
                checked={highPrivilege()}
                onChange={(e: any) => setHighPrivilege(e.target.checked)}
              />
              <Show when={highPrivilege()}>
                <span class="ol-pill" data-tone="danger">
                  Root
                </span>
              </Show>
            </div>
            <FormHelperText>
              {t("plugins.install_modal.high_privilege_help")}
            </FormHelperText>
          </FormControl>
        </div>
      </section>

      <div class="ol-sticky-actions">
        <Button colorScheme="neutral" onClick={() => back()}>
          {t("global.back")}
        </Button>
        <Button
          colorScheme="primary"
          loading={loading()}
          onClick={handleInstall}
        >
          <TbPlus size={15} class="ol-ico" style={{ "margin-right": "6px" }} />
          {t("global.add")}
        </Button>
      </div>
    </div>
  )
}

export default AddPlugin
