import {
  Box,
  Button,
  Checkbox,
  HStack,
  Input,
  Switch as HopeSwitch,
  Table,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import {
  useFetch,
  useListFetch,
  useManageTitle,
  useRouter,
  useT,
} from "~/hooks"
import { handleResp, notify, r } from "~/utils"
import { Meta, PEmptyResp, PPageResp } from "~/types"
import { DeletePopover } from "../common/DeletePopover"
import { FolderChooseInput, Wether } from "~/components"

const Metas = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.metas")
  const { to } = useRouter()
  const [getMetasLoading, getMetas] = useFetch(
    (): PPageResp<Meta> => r.get("/admin/meta/list"),
  )
  const [metas, setMetas] = createSignal<Meta[]>([])
  const [gridMode, setGridMode] = createSignal(false)
  const [savingAll, setSavingAll] = createSignal(false)
  const refresh = async () => {
    const resp = await getMetas()
    handleResp(resp, (data) => setMetas(data.content))
  }
  refresh()

  const [deleting, deleteMeta] = useListFetch(
    (id: number): PEmptyResp => r.post(`/admin/meta/delete?id=${id}`),
  )
  const [, saveMeta] = useFetch(
    (meta: Meta): PEmptyResp => r.post(`/admin/meta/update`, meta),
  )
  const updateMeta = <K extends keyof Meta>(
    index: number,
    key: K,
    value: Meta[K],
  ) => {
    setMetas((items) =>
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    )
  }
  const saveAll = async () => {
    if (savingAll()) return
    setSavingAll(true)
    let hasError = false
    try {
      for (const meta of metas()) {
        try {
          const resp = await saveMeta(meta)
          handleResp(resp, undefined, () => {
            hasError = true
          })
        } catch (error) {
          hasError = true
          notify.error(String(error))
        }
      }
    } finally {
      setSavingAll(false)
    }
    if (!hasError) {
      notify.success(t("global.save_success"))
      refresh()
    }
  }
  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2">
        <Button
          colorScheme="accent"
          loading={getMetasLoading()}
          onClick={refresh}
        >
          {t("global.refresh")}
        </Button>
        <Button
          onClick={() => {
            to("/@manage/metas/add")
          }}
        >
          {t("global.add")}
        </Button>
        <Button
          onClick={() => {
            setGridMode((prev) => !prev)
          }}
        >
          {t(gridMode() ? "metas.list_mode" : "metas.grid_mode")}
        </Button>
        <Show when={gridMode()}>
          <Button colorScheme="accent" loading={savingAll()} onClick={saveAll}>
            {t("metas.save_all")}
          </Button>
        </Show>
      </HStack>
      <Show
        when={gridMode()}
        fallback={
          <Box w="$full" overflowX="auto">
            <Table highlightOnHover dense>
              <Thead>
                <Tr>
                  <For each={["path", "password", "write"]}>
                    {(title) => <Th>{t(`metas.${title}`)}</Th>}
                  </For>
                  <Th>{t("global.operations")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                <For each={metas()}>
                  {(meta) => (
                    <Tr>
                      <Td>{meta.path}</Td>
                      <Td>{meta.password}</Td>
                      <Td>
                        <Wether yes={meta.write} />
                      </Td>
                      {/* <Td>{meta.hide}</Td> */}
                      <Td>
                        <HStack spacing="$2">
                          <Button
                            onClick={() => {
                              to(`/@manage/metas/edit/${meta.id}`)
                            }}
                          >
                            {t("global.edit")}
                          </Button>
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
                        </HStack>
                      </Td>
                    </Tr>
                  )}
                </For>
              </Tbody>
            </Table>
          </Box>
        }
      >
        <Box w="$full" overflowX="auto">
          <Table highlightOnHover dense>
            <Thead>
              <Tr>
                <For
                  each={[
                    "path",
                    "password",
                    "write",
                    "hide",
                    "header",
                    "readme",
                  ]}
                >
                  {(title) => <Th>{t(`metas.${title}`)}</Th>}
                </For>
                <Th>{t("global.operations")}</Th>
              </Tr>
            </Thead>
            <Tbody>
              <For each={metas()}>
                {(meta, index) => (
                  <Tr>
                    <Td css={{ minWidth: "240px" }}>
                      <FolderChooseInput
                        value={meta.path}
                        onChange={(path) => updateMeta(index(), "path", path)}
                      />
                    </Td>
                    <Td css={{ minWidth: "200px" }}>
                      <VStack spacing="$1" alignItems="start">
                        <Input
                          value={meta.password}
                          onInput={(e) =>
                            updateMeta(
                              index(),
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
                              index(),
                              "p_sub",
                              e.currentTarget.checked,
                            )
                          }
                        >
                          {t("metas.apply_sub")}
                        </Checkbox>
                      </VStack>
                    </Td>
                    <Td css={{ minWidth: "160px" }}>
                      <VStack spacing="$1" alignItems="start">
                        <HopeSwitch
                          checked={meta.write}
                          onChange={(e: any) =>
                            updateMeta(
                              index(),
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
                              index(),
                              "w_sub",
                              e.currentTarget.checked,
                            )
                          }
                        >
                          {t("metas.apply_sub")}
                        </Checkbox>
                      </VStack>
                    </Td>
                    <Td css={{ minWidth: "220px" }}>
                      <VStack spacing="$1" alignItems="start">
                        <Textarea
                          rows={2}
                          value={meta.hide}
                          onChange={(e) =>
                            updateMeta(index(), "hide", e.currentTarget.value)
                          }
                        />
                        <Checkbox
                          css={{ whiteSpace: "nowrap" }}
                          checked={meta.h_sub}
                          onChange={(e: any) =>
                            updateMeta(
                              index(),
                              "h_sub",
                              e.currentTarget.checked,
                            )
                          }
                        >
                          {t("metas.apply_sub")}
                        </Checkbox>
                      </VStack>
                    </Td>
                    <Td css={{ minWidth: "220px" }}>
                      <VStack spacing="$1" alignItems="start">
                        <Textarea
                          rows={2}
                          value={meta.header}
                          onChange={(e) =>
                            updateMeta(index(), "header", e.currentTarget.value)
                          }
                        />
                        <Checkbox
                          css={{ whiteSpace: "nowrap" }}
                          checked={meta.header_sub}
                          onChange={(e: any) =>
                            updateMeta(
                              index(),
                              "header_sub",
                              e.currentTarget.checked,
                            )
                          }
                        >
                          {t("metas.apply_sub")}
                        </Checkbox>
                      </VStack>
                    </Td>
                    <Td css={{ minWidth: "220px" }}>
                      <VStack spacing="$1" alignItems="start">
                        <Textarea
                          rows={2}
                          value={meta.readme}
                          onChange={(e) =>
                            updateMeta(index(), "readme", e.currentTarget.value)
                          }
                        />
                        <Checkbox
                          css={{ whiteSpace: "nowrap" }}
                          checked={meta.r_sub}
                          onChange={(e: any) =>
                            updateMeta(
                              index(),
                              "r_sub",
                              e.currentTarget.checked,
                            )
                          }
                        >
                          {t("metas.apply_sub")}
                        </Checkbox>
                      </VStack>
                    </Td>
                    <Td>
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
                    </Td>
                  </Tr>
                )}
              </For>
            </Tbody>
          </Table>
        </Box>
      </Show>
    </VStack>
  )
}

export default Metas
