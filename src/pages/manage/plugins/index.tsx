import {
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  VStack,
} from "@hope-ui/solid"
import { createStorageSignal } from "@solid-primitives/storage"
import {
  TbDownload,
  TbFileImport,
  TbLayoutGrid,
  TbList,
  TbPlus,
  TbPuzzle,
  TbRefresh,
  TbSearch,
} from "solid-icons/tb"
import {
  createMemo,
  createSignal,
  For,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { EmptyResp, PageResp, PluginItem, Resp } from "~/types"
import { handleResp, notify, pluginEngine, r } from "~/utils"
import { PluginGridItem, PluginListItem } from "./Plugin"

const Plugins = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.plugins")
  const { to } = useRouter()

  const [plugins, setPlugins] = createSignal<PluginItem[]>([])
  const [selectedType, setSelectedType] = createSignal<string>("all")
  const [searchQuery, setSearchQuery] = createSignal("")

  const [importModalOpen, setImportModalOpen] = createSignal(false)
  const [importJsonText, setImportJsonText] = createSignal("")

  const [layout, setLayout] = createStorageSignal(
    "plugins-layout",
    "table" as "grid" | "table",
  )

  const [loading, fetchPlugins] = useFetch((): Promise<PageResp<PluginItem>> =>
    r.get("/admin/plugin/list"),
  )

  const refresh = async () => {
    const resp = await fetchPlugins()
    handleResp(resp, (data) => {
      setPlugins(data.content || [])
    })
  }

  onMount(() => {
    refresh()
  })

  const shownPlugins = createMemo(() => {
    const type = selectedType()
    const q = searchQuery().trim().toLowerCase()
    return plugins().filter((p) => {
      if (type !== "all" && p.type !== type) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.author || "").toLowerCase().includes(q)
      )
    })
  })

  const handleToggle = async (plugin: PluginItem) => {
    const resp: Resp<{ id: string; enabled: boolean }> = await r.post(
      "/admin/plugin/toggle",
      { id: plugin.id, enabled: !plugin.enabled },
    )
    handleResp(resp, (data) => {
      setPlugins((prev) =>
        prev.map((p) =>
          p.id === data.id ? { ...p, enabled: data.enabled } : p,
        ),
      )
      if (data.enabled) {
        pluginEngine.loadPlugin({ ...plugin, enabled: true })
        notify.success(t("global.enable") + " " + t("global.success"))
      } else {
        pluginEngine.unloadPlugin(plugin.id)
        notify.info(t("global.disable") + " " + t("global.success"))
      }
    })
  }

  const handleDelete = async (plugin: PluginItem) => {
    const resp: EmptyResp = await r.post(`/admin/plugin/delete?id=${plugin.id}`)
    handleResp(resp, () => {
      pluginEngine.unloadPlugin(plugin.id)
      setPlugins((prev) => prev.filter((p) => p.id !== plugin.id))
      notify.success(t("global.delete_success"))
    })
  }

  const handleExportJson = () => {
    const dataStr = JSON.stringify(plugins(), null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `openlist-plugins-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    notify.success(t("plugins.actions.export") + " " + t("global.success"))
  }

  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(importJsonText())
      if (!Array.isArray(parsed)) {
        notify.error("Invalid JSON: must be an array of plugins")
        return
      }
      const resp: Resp<{ count: number }> = await r.post(
        "/admin/plugin/batch_save",
        parsed,
      )
      handleResp(resp, () => {
        notify.success(t("global.success"))
        setImportModalOpen(false)
        setImportJsonText("")
        refresh()
      })
    } catch (e: any) {
      notify.error("JSON parse failed: " + e.message)
    }
  }

  const categories = createMemo(() => [
    { key: "all", label: t("plugins.types.all") },
    { key: "ui", label: t("plugins.types.ui") },
    { key: "preview", label: t("plugins.types.preview") },
    { key: "tool", label: t("plugins.types.tool") },
    { key: "theme", label: t("plugins.types.theme") },
    { key: "integration", label: t("plugins.types.integration") },
    { key: "system", label: t("plugins.types.system") },
  ])

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("plugins.title")}</h1>
          <p class="ol-admin-subtitle">{t("plugins.subtitle")}</p>
        </div>
        <div class="ol-admin-head__actions">
          <Button
            size="sm"
            colorScheme="neutral"
            loading={loading()}
            onClick={refresh}
          >
            <TbRefresh
              size={15}
              class="ol-ico"
              style={{ "margin-right": "6px" }}
            />
            {t("global.refresh")}
          </Button>
          <Button
            size="sm"
            colorScheme="neutral"
            onClick={() => setImportModalOpen(true)}
          >
            <TbFileImport
              size={15}
              class="ol-ico"
              style={{ "margin-right": "6px" }}
            />
            {t("plugins.actions.import")}
          </Button>
          <Button size="sm" colorScheme="neutral" onClick={handleExportJson}>
            <TbDownload
              size={15}
              class="ol-ico"
              style={{ "margin-right": "6px" }}
            />
            {t("plugins.actions.export")}
          </Button>
          <Button
            size="sm"
            colorScheme="primary"
            onClick={() => {
              to("/@manage/plugins/add")
            }}
          >
            <TbPlus
              size={15}
              class="ol-ico"
              style={{ "margin-right": "6px" }}
            />
            {t("plugins.actions.install")}
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div class="ol-admin-tabs" role="tablist">
        <For each={categories()}>
          {(cat) => {
            const active = () => selectedType() === cat.key
            return (
              <button
                type="button"
                role="tab"
                class="ol-admin-tab"
                data-active={active() ? "true" : "false"}
                aria-selected={active() ? "true" : "false"}
                onClick={() => setSelectedType(cat.key)}
              >
                <span>{cat.label}</span>
              </button>
            )
          }}
        </For>
      </div>

      {/* Search & Layout Switch Toolbar */}
      <div class="ol-admin-toolbar">
        <div class="ol-admin-toolbar__left">
          <div class="ol-admin-search">
            <TbSearch size={15} class="ol-ico" />
            <input
              type="search"
              value={searchQuery()}
              placeholder={t("plugins.search_placeholder")}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
          </div>
        </div>
        <div class="ol-admin-toolbar__right">
          <span class="ol-pill ol-tabular">{shownPlugins().length}</span>
          <div class="ol-seg">
            <button
              type="button"
              class="ol-seg__btn"
              aria-pressed={layout() === "table"}
              title={t("manage.common.table_view")}
              onClick={() => setLayout("table")}
            >
              <TbList size={15} class="ol-ico" />
            </button>
            <button
              type="button"
              class="ol-seg__btn"
              aria-pressed={layout() === "grid"}
              title={t("manage.common.grid_view")}
              onClick={() => setLayout("grid")}
            >
              <TbLayoutGrid size={15} class="ol-ico" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Show
        when={shownPlugins().length > 0}
        fallback={
          <div class="ol-admin-card">
            <div class="ol-admin-empty">
              <TbPuzzle size={24} class="ol-ico" />
              <span>
                {plugins().length === 0
                  ? t("plugins.empty_installed")
                  : t("manage.common.no_results")}
              </span>
            </div>
          </div>
        }
      >
        <Switch>
          <Match when={layout() === "table"}>
            <div class="ol-admin-table-wrap">
              <table class="ol-admin-table">
                <thead>
                  <tr>
                    <th>{t("plugins.name")}</th>
                    <th>{t("plugins.type")}</th>
                    <th>{t("plugins.version")}</th>
                    <th>{t("plugins.author")}</th>
                    <th>{t("plugins.status_col")}</th>
                    <th>{t("global.operations")}</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={shownPlugins()}>
                    {(plugin) => (
                      <PluginListItem
                        plugin={plugin}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Match>

          <Match when={layout() === "grid"}>
            <div class="ol-admin-grid">
              <For each={shownPlugins()}>
                {(plugin) => (
                  <PluginGridItem
                    plugin={plugin}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                )}
              </For>
            </div>
          </Match>
        </Switch>
      </Show>

      {/* Import JSON Modal */}
      <Modal
        opened={importModalOpen()}
        onClose={() => setImportModalOpen(false)}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>{t("plugins.import_modal.title")}</ModalHeader>
          <ModalBody>
            <VStack spacing="$3" alignItems="stretch">
              <Text fontSize="$sm" color="$neutral11">
                {t("plugins.import_modal.paste_json")}
              </Text>
              <Textarea
                rows={10}
                style={{ "font-family": "var(--ol-font-mono)" }}
                placeholder='[{"id": "plugin-1", "name": "...", "enabled": true}]'
                value={importJsonText()}
                onInput={(e: any) => setImportJsonText(e.target.value)}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing="$2">
              <Button
                colorScheme="neutral"
                onClick={() => setImportModalOpen(false)}
              >
                {t("global.cancel")}
              </Button>
              <Button colorScheme="primary" onClick={handleImportJson}>
                {t("plugins.actions.import")}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

export default Plugins
