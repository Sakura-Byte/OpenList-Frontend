import {
  Checkbox,
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
  Switch as HopeSwitch,
  Textarea,
} from "@hope-ui/solid"
import { createStorageSignal } from "@solid-primitives/storage"
import {
  TbCheck,
  TbEdit,
  TbLayoutGrid,
  TbList,
  TbPlus,
  TbRefresh,
  TbReplace,
  TbSearch,
  TbX,
} from "solid-icons/tb"
import { createMemo, createSignal, For, Show } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { FolderChooseInput } from "~/components"
import {
  useFetch,
  useListFetch,
  useManageTitle,
  useRouter,
  useT,
} from "~/hooks"
import { Meta, MetaGridUpdate, PEmptyResp, PPageResp } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { DeletePopover } from "../common/DeletePopover"

export function parseArchivePasswordsText(raw: string): string[] {
  return raw
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function formatArchivePasswordsText(list?: string[]): string {
  return (list ?? []).join("\n")
}

const Metas = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.metas")
  const { to } = useRouter()

  const [getMetasLoading, getMetas] = useFetch((): PPageResp<Meta> =>
    r.get("/admin/meta/list"),
  )
  const [metaState, setMetaState] = createStore({ metas: [] as Meta[] })
  const metas = () => metaState.metas

  const [layout, setLayout] = createStorageSignal(
    "metas-layout",
    "list" as "grid" | "list",
  )
  const gridMode = () => layout() === "grid"

  const [search, setSearch] = createSignal("")
  const [savingAll, setSavingAll] = createSignal(false)
  const [batchFind, setBatchFind] = createSignal("")
  const [batchReplace, setBatchReplace] = createSignal("")
  const [batchUseRegex, setBatchUseRegex] = createSignal(false)
  const [batchApplyHeader, setBatchApplyHeader] = createSignal(false)
  const [batchApplyReadme, setBatchApplyReadme] = createSignal(true)
  const { isOpen, onOpen, onClose } = createDisclosure()

  const refresh = async () => {
    const resp = await getMetas()
    handleResp(resp, (data) =>
      setMetaState("metas", reconcile(data.content ?? [], { key: "id" })),
    )
  }
  refresh()

  const [deleting, deleteMeta] = useListFetch((id: number): PEmptyResp =>
    r.post(`/admin/meta/delete?id=${id}`),
  )

  const updateMeta = <K extends keyof Meta>(
    id: number,
    key: K,
    value: Meta[K],
  ) => {
    setMetaState(
      "metas",
      (item) => item.id === id,
      key,
      () => value,
    )
  }

  const shownMetas = createMemo(() => {
    const q = search().trim().toLowerCase()
    if (!q) return metas()
    return metas().filter(
      (meta) =>
        meta.path.toLowerCase().includes(q) ||
        (meta.source_note ?? "").toLowerCase().includes(q),
    )
  })

  const saveAll = async () => {
    if (savingAll() || metas().length === 0) return
    setSavingAll(true)
    try {
      const updates: MetaGridUpdate[] = metas().map((meta) => ({
        id: meta.id,
        path: meta.path,
        password: meta.password,
        p_sub: meta.p_sub,
        write: meta.write,
        w_sub: meta.w_sub,
        hide: meta.hide,
        h_sub: meta.h_sub,
        header: meta.header,
        header_sub: meta.header_sub,
        readme: meta.readme,
        r_sub: meta.r_sub,
        source_note: meta.source_note ?? "",
        source_sub: Boolean(meta.source_sub),
        archive_passwords: meta.archive_passwords ?? [],
        archive_passwords_sub: Boolean(meta.archive_passwords_sub),
        stop_header: Boolean(meta.stop_header),
        stop_readme: Boolean(meta.stop_readme),
      }))
      const resp: Awaited<PEmptyResp> = await r.post(
        "/admin/meta/update_grid",
        {
          metas: updates,
        },
      )
      if (resp.code === 200) {
        notify.success(t("global.save_success"))
        await refresh()
      } else {
        handleResp(resp)
      }
    } catch (error) {
      notify.error(String(error))
    } finally {
      setSavingAll(false)
    }
  }

  const applyBatchReplace = () => {
    const findValue = batchFind()
    if (!findValue) {
      notify.error(t("global.empty_input"))
      return
    }
    if (!batchApplyHeader() && !batchApplyReadme()) {
      notify.error(t("metas.batch_replace_no_target"))
      return
    }
    let replaceFn: (value: string) => string
    if (batchUseRegex()) {
      let regex: RegExp
      try {
        regex = new RegExp(findValue, "g")
      } catch (error) {
        notify.error(String(error))
        return
      }
      replaceFn = (value) => value.replace(regex, batchReplace())
    } else {
      replaceFn = (value) => value.split(findValue).join(batchReplace())
    }
    setMetaState("metas", (items) =>
      items.map((item) => {
        const next = { ...item }
        if (batchApplyHeader()) {
          next.header = replaceFn(next.header)
        }
        if (batchApplyReadme()) {
          next.readme = replaceFn(next.readme)
        }
        return next
      }),
    )
    onClose()
  }

  const cellStackStyle = {
    display: "flex",
    "flex-direction": "column",
    "align-items": "flex-start",
    gap: "6px",
  } as const

  return (
    <>
      <div class="ol-admin-page">
        <div class="ol-admin-head">
          <div class="ol-admin-head__main">
            <h1 class="ol-admin-title">{t("manage.sidemenu.metas")}</h1>
            <p class="ol-admin-subtitle ol-tabular">
              {t("manage.common.total")}: {metas().length}
            </p>
          </div>

          <div class="ol-admin-head__actions">
            <button
              type="button"
              class="ol-btn"
              disabled={getMetasLoading() || savingAll()}
              onClick={refresh}
            >
              <TbRefresh size={15} class="ol-ico" />
              <span>{t("global.refresh")}</span>
            </button>
            <button
              type="button"
              class="ol-btn ol-btn--primary"
              disabled={savingAll()}
              onClick={() => to("/@manage/metas/add")}
            >
              <TbPlus size={15} class="ol-ico" />
              <span>{t("global.add")}</span>
            </button>
          </div>
        </div>

        <div class="ol-admin-toolbar">
          <div class="ol-admin-toolbar__left">
            <div class="ol-admin-search">
              <TbSearch size={15} class="ol-ico" />
              <input
                type="search"
                value={search()}
                placeholder={t("manage.common.search")}
                aria-label={t("manage.common.search")}
                onInput={(e) => setSearch(e.currentTarget.value)}
              />
            </div>

            <Show when={search().trim().length > 0}>
              <button
                type="button"
                class="ol-btn ol-btn--ghost"
                onClick={() => setSearch("")}
              >
                <TbX size={14} class="ol-ico" />
                <span>{t("manage.common.reset")}</span>
              </button>
            </Show>
          </div>

          <div class="ol-admin-toolbar__right">
            <Show when={gridMode()}>
              <button
                type="button"
                class="ol-btn"
                disabled={savingAll()}
                onClick={onOpen}
              >
                <TbReplace size={15} class="ol-ico" />
                <span>{t("metas.batch_replace")}</span>
              </button>
              <button
                type="button"
                class="ol-btn ol-btn--primary"
                disabled={
                  savingAll() || getMetasLoading() || metas().length === 0
                }
                onClick={saveAll}
              >
                <TbCheck size={15} class="ol-ico" />
                <span>{t("metas.save_all")}</span>
              </button>
            </Show>

            <div class="ol-admin-toolbar__group">
              <button
                type="button"
                class="ol-icon-btn"
                style={{
                  width: "auto",
                  padding: "0 10px",
                  display: "inline-flex",
                  "align-items": "center",
                  gap: "6px",
                  "font-size": "13px",
                  "font-weight": "500",
                }}
                disabled={savingAll()}
                data-active={!gridMode()}
                aria-pressed={!gridMode()}
                title={t("metas.list_mode")}
                onClick={() => setLayout("list")}
              >
                <TbList size={16} class="ol-ico" />
                <span>{t("metas.list_mode")}</span>
              </button>
              <button
                type="button"
                class="ol-icon-btn"
                style={{
                  width: "auto",
                  padding: "0 10px",
                  display: "inline-flex",
                  "align-items": "center",
                  gap: "6px",
                  "font-size": "13px",
                  "font-weight": "500",
                }}
                disabled={savingAll()}
                data-active={gridMode()}
                aria-pressed={gridMode()}
                title={t("metas.grid_mode")}
                onClick={() => setLayout("grid")}
              >
                <TbLayoutGrid size={16} class="ol-ico" />
                <span>{t("metas.grid_mode")}</span>
              </button>
            </div>
          </div>
        </div>

        <Show
          when={shownMetas().length > 0}
          fallback={
            <div class="ol-admin-card">
              <div class="ol-admin-empty">
                <span>
                  {metas().length === 0
                    ? t("manage.common.no_data")
                    : t("manage.common.no_results")}
                </span>
                <Show
                  when={metas().length === 0}
                  fallback={
                    <button
                      type="button"
                      class="ol-btn"
                      onClick={() => setSearch("")}
                    >
                      <TbX size={14} class="ol-ico" />
                      <span>{t("manage.common.reset")}</span>
                    </button>
                  }
                >
                  <button
                    type="button"
                    class="ol-btn ol-btn--primary"
                    onClick={() => to("/@manage/metas/add")}
                  >
                    <TbPlus size={15} class="ol-ico" />
                    <span>{t("global.add")}</span>
                  </button>
                </Show>
              </div>
            </div>
          }
        >
          <Show
            when={gridMode()}
            fallback={
              <div class="ol-admin-table-wrap">
                <table class="ol-admin-table">
                  <thead>
                    <tr>
                      <For
                        each={[
                          "path",
                          "password",
                          "source_note",
                          "archive_passwords",
                          "write",
                        ]}
                      >
                        {(title) => <th>{t(`metas.${title}`)}</th>}
                      </For>
                      <th>{t("global.operations")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={shownMetas()}>
                      {(meta) => (
                        <tr>
                          <td
                            style={{
                              "font-family": "var(--ol-font-mono)",
                              "font-weight": "500",
                              "word-break": "break-all",
                              "min-width": "180px",
                            }}
                          >
                            {meta.path}
                          </td>
                          <td>
                            <Show
                              when={meta.password}
                              fallback={
                                <span style={{ color: "var(--ol-text-faint)" }}>
                                  —
                                </span>
                              }
                            >
                              <span
                                class="ol-pill"
                                style={{ "font-family": "var(--ol-font-mono)" }}
                              >
                                {meta.password}
                              </span>
                            </Show>
                          </td>
                          <td
                            style={{
                              color: "var(--ol-text-secondary)",
                              "max-width": "260px",
                              "word-break": "break-word",
                            }}
                          >
                            {meta.source_note || "—"}
                          </td>
                          <td>
                            <Show
                              when={(meta.archive_passwords ?? []).length > 0}
                              fallback={
                                <span style={{ color: "var(--ol-text-faint)" }}>
                                  —
                                </span>
                              }
                            >
                              <div
                                style={{
                                  display: "flex",
                                  "flex-wrap": "wrap",
                                  gap: "4px",
                                }}
                              >
                                <For each={meta.archive_passwords ?? []}>
                                  {(pw) => (
                                    <span
                                      class="ol-pill"
                                      style={{
                                        "font-family": "var(--ol-font-mono)",
                                      }}
                                    >
                                      {pw}
                                    </span>
                                  )}
                                </For>
                              </div>
                            </Show>
                          </td>
                          <td>
                            <span class="ol-status">
                              <span
                                class="ol-status-dot"
                                data-status={meta.write ? "warn" : "disabled"}
                              />
                              <span>
                                {t(`global.${meta.write ? "yes" : "no"}`)}
                              </span>
                            </span>
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                "align-items": "center",
                                "flex-wrap": "wrap",
                                gap: "6px",
                              }}
                            >
                              <button
                                type="button"
                                class="ol-btn"
                                onClick={() =>
                                  to(`/@manage/metas/edit/${meta.id}`)
                                }
                              >
                                <TbEdit size={14} class="ol-ico" />
                                <span>{t("global.edit")}</span>
                              </button>
                              <DeletePopover
                                name={meta.path}
                                loading={deleting() === meta.id}
                                onClick={async () => {
                                  const resp = await deleteMeta(meta.id)
                                  handleResp(resp, () => {
                                    notify.success(t("global.delete_success"))
                                    refresh()
                                  })
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            }
          >
            <fieldset
              disabled={savingAll()}
              style={{
                width: "100%",
                "min-width": "0",
                margin: "0",
                padding: "0",
                border: "none",
              }}
            >
              <div class="ol-admin-table-wrap">
                <table class="ol-admin-table">
                  <thead>
                    <tr>
                      <For
                        each={[
                          "path",
                          "password",
                          "write",
                          "hide",
                          "source_note",
                          "archive_passwords",
                          "header",
                          "readme",
                        ]}
                      >
                        {(title) => <th>{t(`metas.${title}`)}</th>}
                      </For>
                      <th>{t("global.operations")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={shownMetas()}>
                      {(meta) => (
                        <tr>
                          <td
                            style={{
                              "min-width": "240px",
                              "vertical-align": "top",
                            }}
                          >
                            <FolderChooseInput
                              value={meta.path}
                              onChange={(path) =>
                                updateMeta(meta.id, "path", path)
                              }
                            />
                          </td>
                          <td
                            style={{
                              "min-width": "200px",
                              "vertical-align": "top",
                            }}
                          >
                            <div style={cellStackStyle}>
                              <Input
                                value={meta.password}
                                onInput={(e) =>
                                  updateMeta(
                                    meta.id,
                                    "password",
                                    e.currentTarget.value,
                                  )
                                }
                              />
                              <Checkbox
                                css={{ whiteSpace: "nowrap" }}
                                checked={meta.p_sub}
                                onChange={(e: any) =>
                                  updateMeta(
                                    meta.id,
                                    "p_sub",
                                    e.currentTarget.checked,
                                  )
                                }
                              >
                                {t("metas.apply_sub")}
                              </Checkbox>
                            </div>
                          </td>
                          <td
                            style={{
                              "min-width": "156px",
                              "vertical-align": "top",
                            }}
                          >
                            <div style={cellStackStyle}>
                              <HopeSwitch
                                checked={meta.write}
                                onChange={(e: any) =>
                                  updateMeta(
                                    meta.id,
                                    "write",
                                    e.currentTarget.checked,
                                  )
                                }
                              />
                              <Checkbox
                                css={{ whiteSpace: "nowrap" }}
                                checked={meta.w_sub}
                                onChange={(e: any) =>
                                  updateMeta(
                                    meta.id,
                                    "w_sub",
                                    e.currentTarget.checked,
                                  )
                                }
                              >
                                {t("metas.apply_sub")}
                              </Checkbox>
                            </div>
                          </td>
                          <td
                            style={{
                              "min-width": "220px",
                              "vertical-align": "top",
                            }}
                          >
                            <div style={cellStackStyle}>
                              <Textarea
                                rows={2}
                                value={meta.hide}
                                onInput={(e) =>
                                  updateMeta(
                                    meta.id,
                                    "hide",
                                    e.currentTarget.value,
                                  )
                                }
                              />
                              <Checkbox
                                css={{ whiteSpace: "nowrap" }}
                                checked={meta.h_sub}
                                onChange={(e: any) =>
                                  updateMeta(
                                    meta.id,
                                    "h_sub",
                                    e.currentTarget.checked,
                                  )
                                }
                              >
                                {t("metas.apply_sub")}
                              </Checkbox>
                            </div>
                          </td>
                          <td
                            style={{
                              "min-width": "220px",
                              "vertical-align": "top",
                            }}
                          >
                            <div style={cellStackStyle}>
                              <Input
                                value={meta.source_note ?? ""}
                                onInput={(e) =>
                                  updateMeta(
                                    meta.id,
                                    "source_note",
                                    e.currentTarget.value,
                                  )
                                }
                              />
                              <Checkbox
                                css={{ whiteSpace: "nowrap" }}
                                checked={Boolean(meta.source_sub)}
                                onChange={(e: any) =>
                                  updateMeta(
                                    meta.id,
                                    "source_sub",
                                    e.currentTarget.checked,
                                  )
                                }
                              >
                                {t("metas.apply_sub")}
                              </Checkbox>
                            </div>
                          </td>
                          <td
                            style={{
                              "min-width": "220px",
                              "vertical-align": "top",
                            }}
                          >
                            <div style={cellStackStyle}>
                              <Textarea
                                rows={2}
                                value={formatArchivePasswordsText(
                                  meta.archive_passwords,
                                )}
                                onInput={(e) =>
                                  updateMeta(
                                    meta.id,
                                    "archive_passwords",
                                    parseArchivePasswordsText(
                                      e.currentTarget.value,
                                    ),
                                  )
                                }
                              />
                              <Checkbox
                                css={{ whiteSpace: "nowrap" }}
                                checked={Boolean(meta.archive_passwords_sub)}
                                onChange={(e: any) =>
                                  updateMeta(
                                    meta.id,
                                    "archive_passwords_sub",
                                    e.currentTarget.checked,
                                  )
                                }
                              >
                                {t("metas.apply_sub")}
                              </Checkbox>
                            </div>
                          </td>
                          <td
                            style={{
                              "min-width": "230px",
                              "vertical-align": "top",
                            }}
                          >
                            <div style={cellStackStyle}>
                              <Textarea
                                rows={2}
                                value={meta.header}
                                onInput={(e) =>
                                  updateMeta(
                                    meta.id,
                                    "header",
                                    e.currentTarget.value,
                                  )
                                }
                              />
                              <Checkbox
                                css={{ whiteSpace: "nowrap" }}
                                checked={meta.header_sub}
                                onChange={(e: any) =>
                                  updateMeta(
                                    meta.id,
                                    "header_sub",
                                    e.currentTarget.checked,
                                  )
                                }
                              >
                                {t("metas.apply_sub")}
                              </Checkbox>
                              <Checkbox
                                css={{ whiteSpace: "nowrap" }}
                                checked={Boolean(meta.stop_header)}
                                onChange={(e: any) =>
                                  updateMeta(
                                    meta.id,
                                    "stop_header",
                                    e.currentTarget.checked,
                                  )
                                }
                              >
                                {t("metas.stop_header")}
                              </Checkbox>
                            </div>
                          </td>
                          <td
                            style={{
                              "min-width": "230px",
                              "vertical-align": "top",
                            }}
                          >
                            <div style={cellStackStyle}>
                              <Textarea
                                rows={2}
                                value={meta.readme}
                                onInput={(e) =>
                                  updateMeta(
                                    meta.id,
                                    "readme",
                                    e.currentTarget.value,
                                  )
                                }
                              />
                              <Checkbox
                                css={{ whiteSpace: "nowrap" }}
                                checked={meta.r_sub}
                                onChange={(e: any) =>
                                  updateMeta(
                                    meta.id,
                                    "r_sub",
                                    e.currentTarget.checked,
                                  )
                                }
                              >
                                {t("metas.apply_sub")}
                              </Checkbox>
                              <Checkbox
                                css={{ whiteSpace: "nowrap" }}
                                checked={Boolean(meta.stop_readme)}
                                onChange={(e: any) =>
                                  updateMeta(
                                    meta.id,
                                    "stop_readme",
                                    e.currentTarget.checked,
                                  )
                                }
                              >
                                {t("metas.stop_readme")}
                              </Checkbox>
                            </div>
                          </td>
                          <td style={{ "vertical-align": "top" }}>
                            <DeletePopover
                              name={meta.path}
                              loading={deleting() === meta.id}
                              onClick={async () => {
                                const resp = await deleteMeta(meta.id)
                                handleResp(resp, () => {
                                  notify.success(t("global.delete_success"))
                                  refresh()
                                })
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </fieldset>

            <div class="ol-sticky-actions">
              <button
                type="button"
                class="ol-btn"
                disabled={savingAll()}
                onClick={onOpen}
              >
                <TbReplace size={15} class="ol-ico" />
                <span>{t("metas.batch_replace")}</span>
              </button>
              <button
                type="button"
                class="ol-btn ol-btn--primary"
                disabled={
                  savingAll() || getMetasLoading() || metas().length === 0
                }
                onClick={saveAll}
              >
                <TbCheck size={15} class="ol-ico" />
                <span>{t("metas.save_all")}</span>
              </button>
            </div>
          </Show>
        </Show>
      </div>

      <Modal opened={isOpen()} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>{t("metas.batch_replace")}</ModalHeader>
          <ModalBody>
            <div class="ol-admin-form-stack">
              <FormControl w="$full" display="flex" flexDirection="column">
                <FormLabel for="metas-batch-find">{t("metas.find")}</FormLabel>
                <Textarea
                  id="metas-batch-find"
                  rows={3}
                  value={batchFind()}
                  onInput={(e) => setBatchFind(e.currentTarget.value)}
                />
              </FormControl>
              <FormControl w="$full" display="flex" flexDirection="column">
                <FormLabel for="metas-batch-replace">
                  {t("metas.replace")}
                </FormLabel>
                <Textarea
                  id="metas-batch-replace"
                  rows={3}
                  value={batchReplace()}
                  onInput={(e) => setBatchReplace(e.currentTarget.value)}
                />
              </FormControl>
              <Checkbox
                checked={batchUseRegex()}
                onChange={(e: any) => setBatchUseRegex(e.currentTarget.checked)}
              >
                {t("metas.use_regex")}
              </Checkbox>
              <div
                style={{
                  display: "flex",
                  "align-items": "center",
                  "flex-wrap": "wrap",
                  gap: "14px",
                }}
              >
                <Checkbox
                  checked={batchApplyHeader()}
                  onChange={(e: any) =>
                    setBatchApplyHeader(e.currentTarget.checked)
                  }
                >
                  {t("metas.header")}
                </Checkbox>
                <Checkbox
                  checked={batchApplyReadme()}
                  onChange={(e: any) =>
                    setBatchApplyReadme(e.currentTarget.checked)
                  }
                >
                  {t("metas.readme")}
                </Checkbox>
              </div>
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
              <button type="button" class="ol-btn" onClick={onClose}>
                <span>{t("global.cancel")}</span>
              </button>
              <button
                type="button"
                class="ol-btn ol-btn--primary"
                disabled={!batchFind()}
                onClick={applyBatchReplace}
              >
                <TbReplace size={15} class="ol-ico" />
                <span>{t("metas.apply_replace")}</span>
              </button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default Metas
