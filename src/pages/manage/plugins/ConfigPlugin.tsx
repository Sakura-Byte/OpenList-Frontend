import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
  Switch as HopeSwitch,
  Textarea,
} from "@hope-ui/solid"
import { TbArrowLeft, TbCheck, TbPuzzle } from "solid-icons/tb"
import { createSignal, For, onMount, Show } from "solid-js"
import { MaybeLoading } from "~/components"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { PluginConfigField, PluginItem, Resp } from "~/types"
import { handleResp, notify, pluginEngine, r } from "~/utils"

const ConfigPlugin = () => {
  const t = useT()
  const { params, back, to } = useRouter()
  const id = decodeURIComponent(params.id || "")
  useManageTitle("plugins.config_modal.title")

  const [plugin, setPlugin] = createSignal<PluginItem | null>(null)
  const [formValues, setFormValues] = createSignal<Record<string, any>>({})
  const [highPrivilege, setHighPrivilege] = createSignal(false)
  const [enabled, setEnabled] = createSignal(true)
  const [saving, setSaving] = createSignal(false)

  const [fetchLoading, fetchPlugin] = useFetch((): Promise<Resp<PluginItem>> =>
    r.get(`/admin/plugin/get?id=${encodeURIComponent(id)}`),
  )

  const initData = async () => {
    const resp = await fetchPlugin()
    handleResp(
      resp,
      (data) => {
        setPlugin(data)
        setHighPrivilege(!!data.high_privilege)
        setEnabled(!!data.enabled)
        const initial: Record<string, any> = {}
        if (data.config_schema) {
          data.config_schema.forEach((field) => {
            if (
              data.config_values &&
              data.config_values[field.key] !== undefined
            ) {
              initial[field.key] = data.config_values[field.key]
            } else if (field.defaultValue !== undefined) {
              initial[field.key] = field.defaultValue
            }
          })
        }
        setFormValues(initial)
      },
      (msg) => {
        notify.error("Plugin not found: " + msg)
        back()
      },
    )
  }

  onMount(() => {
    if (id) {
      initData()
    }
  })

  const handleFieldChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    const p = plugin()
    if (!p) return
    setSaving(true)
    try {
      const resp: Resp<PluginItem> = await r.post("/admin/plugin/update", {
        id: p.id,
        config_values: formValues(),
        high_privilege: highPrivilege(),
        enabled: enabled(),
      })
      handleResp(resp, (updated) => {
        if (updated.enabled) {
          pluginEngine.loadPlugin(updated)
        } else {
          pluginEngine.unloadPlugin(updated.id)
        }
        notify.success(t("global.save_success"))
        to("/@manage/plugins")
      })
    } finally {
      setSaving(false)
    }
  }

  const renderFieldInput = (field: PluginConfigField) => {
    const value = () => formValues()[field.key]

    switch (field.type) {
      case "string":
        return (
          <Input
            id={field.key}
            value={value() || ""}
            onInput={(e: any) => handleFieldChange(field.key, e.target.value)}
          />
        )
      case "number":
        return (
          <Input
            id={field.key}
            type="number"
            value={value() ?? 0}
            onInput={(e: any) =>
              handleFieldChange(field.key, parseFloat(e.target.value) || 0)
            }
          />
        )
      case "bool":
        return (
          <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
            <HopeSwitch
              id={field.key}
              checked={!!value()}
              onChange={(e: any) =>
                handleFieldChange(field.key, e.target.checked)
              }
            />
            <span class="ol-status">
              <span
                class="ol-status-dot"
                data-status={value() ? "work" : "disabled"}
              />
              <span>{t(`global.${value() ? "enable" : "disable"}`)}</span>
            </span>
          </div>
        )
      case "select":
        return (
          <Select
            id={field.key}
            value={value() ?? field.options?.[0]}
            onChange={(val: any) => handleFieldChange(field.key, val)}
          >
            <SelectTrigger>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectContent>
              <SelectListbox>
                <For each={field.options || []}>
                  {(opt) => (
                    <SelectOption value={opt}>
                      <SelectOptionText>{opt}</SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  )}
                </For>
              </SelectListbox>
            </SelectContent>
          </Select>
        )
      case "text":
        return (
          <Textarea
            id={field.key}
            rows={4}
            value={value() || ""}
            onInput={(e: any) => handleFieldChange(field.key, e.target.value)}
          />
        )
      default:
        return (
          <Input
            id={field.key}
            value={value() || ""}
            onInput={(e: any) => handleFieldChange(field.key, e.target.value)}
          />
        )
    }
  }

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("plugins.config_modal.title")}</h1>
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

      <MaybeLoading loading={fetchLoading()}>
        <Show when={plugin()}>
          <section class="ol-admin-card">
            <div
              style={{ display: "flex", "align-items": "center", gap: "12px" }}
            >
              <span
                style={{
                  display: "inline-grid",
                  "place-items": "center",
                  width: "40px",
                  height: "40px",
                  "border-radius": "var(--ol-radius-sm)",
                  background: "var(--ol-surface-2)",
                  border: "1px solid var(--ol-border)",
                  color: "var(--ol-accent-text)",
                  flex: "none",
                  overflow: "hidden",
                }}
              >
                <Show
                  when={plugin()?.icon}
                  fallback={<TbPuzzle size={20} class="ol-ico" />}
                >
                  <img
                    src={plugin()?.icon}
                    alt=""
                    style={{
                      width: "24px",
                      height: "24px",
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
                  <span style={{ "font-weight": "620", "font-size": "15px" }}>
                    {plugin()?.name}
                  </span>
                  <span class="ol-pill ol-tabular" data-tone="accent">
                    v{plugin()?.version}
                  </span>
                  <span class="ol-pill">{plugin()?.type || "ui"}</span>
                </div>
                <p
                  style={{
                    margin: "3px 0 0",
                    "font-size": "13px",
                    color: "var(--ol-text-secondary)",
                  }}
                >
                  {plugin()?.description || t("plugins.empty_desc")}
                </p>
              </div>
            </div>
          </section>
        </Show>

        <section class="ol-admin-card">
          <div class="ol-admin-form-grid">
            <FormControl w="100%" display="flex" flexDirection="column">
              <FormLabel for="plugin_enable">{t("global.enable")}</FormLabel>
              <div
                style={{ display: "flex", "align-items": "center", gap: "8px" }}
              >
                <HopeSwitch
                  id="plugin_enable"
                  checked={enabled()}
                  onChange={(e: any) => setEnabled(e.target.checked)}
                />
                <span class="ol-status">
                  <span
                    class="ol-status-dot"
                    data-status={enabled() ? "work" : "disabled"}
                  />
                  <span>{t(`global.${enabled() ? "enable" : "disable"}`)}</span>
                </span>
              </div>
            </FormControl>

            <FormControl w="100%" display="flex" flexDirection="column">
              <FormLabel for="plugin_high_privilege">
                {t("plugins.install_modal.high_privilege_label")}
              </FormLabel>
              <div
                style={{ display: "flex", "align-items": "center", gap: "8px" }}
              >
                <HopeSwitch
                  id="plugin_high_privilege"
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

        <section class="ol-admin-card">
          <Show
            when={
              plugin()?.config_schema && plugin()!.config_schema!.length > 0
            }
            fallback={
              <div class="ol-admin-empty">
                <span>{t("plugins.config_modal.no_config")}</span>
              </div>
            }
          >
            <div class="ol-admin-form-grid">
              <For each={plugin()?.config_schema}>
                {(field) => (
                  <div
                    style={
                      field.type === "text"
                        ? { "grid-column": "1 / -1" }
                        : undefined
                    }
                  >
                    <FormControl w="100%" display="flex" flexDirection="column">
                      <FormLabel for={field.key}>{field.label}</FormLabel>
                      {renderFieldInput(field)}
                      <Show when={field.description}>
                        <FormHelperText>{field.description}</FormHelperText>
                      </Show>
                    </FormControl>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </section>

        <div class="ol-sticky-actions">
          <Button colorScheme="neutral" onClick={() => back()}>
            {t("global.back")}
          </Button>
          <Button colorScheme="primary" loading={saving()} onClick={handleSave}>
            <TbCheck
              size={15}
              class="ol-ico"
              style={{ "margin-right": "6px" }}
            />
            {t("global.save")}
          </Button>
        </div>
      </MaybeLoading>
    </div>
  )
}

export default ConfigPlugin
