import {
  Box,
  Button,
  Checkbox,
  createDisclosure,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
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
  const [batchFind, setBatchFind] = createSignal("")
  const [batchReplace, setBatchReplace] = createSignal("")
  const [batchUseRegex, setBatchUseRegex] = createSignal(false)
  const [batchApplyHeader, setBatchApplyHeader] = createSignal(false)
  const [batchApplyReadme, setBatchApplyReadme] = createSignal(true)
  const { isOpen, onOpen, onClose } = createDisclosure()
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
      items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
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
          handleResp(
            resp,
            undefined,
            () => {
              hasError = true
            },
          )
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
    setMetas((items) =>
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
  return (
    <>
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
            <Button onClick={onOpen}>{t("metas.batch_replace")}</Button>
            <Button
              colorScheme="accent"
              loading={savingAll()}
              onClick={saveAll}
            >
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
                          onChange={(path) =>
                            updateMeta(index(), "path", path)
                          }
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
                              updateMeta(
                                index(),
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
                              updateMeta(
                                index(),
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
      <Modal opened={isOpen()} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>{t("metas.batch_replace")}</ModalHeader>
          <ModalBody>
            <VStack spacing="$3" alignItems="start">
              <FormControl w="$full" display="flex" flexDirection="column">
                <FormLabel for="metas-batch-find">
                  {t("metas.find")}
                </FormLabel>
                <Textarea
                  id="metas-batch-find"
                  value={batchFind()}
                  onChange={(e) => setBatchFind(e.currentTarget.value)}
                />
              </FormControl>
              <FormControl w="$full" display="flex" flexDirection="column">
                <FormLabel for="metas-batch-replace">
                  {t("metas.replace")}
                </FormLabel>
                <Textarea
                  id="metas-batch-replace"
                  value={batchReplace()}
                  onChange={(e) => setBatchReplace(e.currentTarget.value)}
                />
              </FormControl>
              <Checkbox
                checked={batchUseRegex()}
                onChange={(e: any) =>
                  setBatchUseRegex(e.currentTarget.checked)
                }
              >
                {t("metas.use_regex")}
              </Checkbox>
              <HStack spacing="$3">
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
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing="$2">
              <Button onClick={onClose}>{t("global.cancel")}</Button>
              <Button
                colorScheme="accent"
                disabled={!batchFind()}
                onClick={applyBatchReplace}
              >
                {t("metas.apply_replace")}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default Metas
