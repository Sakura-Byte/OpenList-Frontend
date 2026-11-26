import {
  Badge,
  Box,
  Button,
  HStack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  VStack,
} from "@hope-ui/solid"
import { For, createSignal } from "solid-js"
import { Wether } from "~/components"
import {
  useFetch,
  useListFetch,
  useManageTitle,
  useRouter,
  useT,
} from "~/hooks"
import { loadPublicNotices } from "~/store"
import { Notice, PEmptyResp, Resp } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { DeletePopover } from "../common/DeletePopover"

const Notices = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.notices")
  const { to } = useRouter()
  const [items, setItems] = createSignal<Notice[]>([])

  const [loading, fetchList] = useFetch(
    (): Promise<Resp<{ content: Notice[]; total: number } | Notice[]>> =>
      r.get("/admin/notice/list"),
  )

  const refresh = async () => {
    const resp = await fetchList()
    handleResp(resp, (data) => {
      const list = Array.isArray(data) ? data : (data?.content ?? [])
      setItems(list)
    })
  }
  refresh()

  const [deleting, deleteItem] = useListFetch((id: number): PEmptyResp =>
    r.post(`/admin/notice/delete?id=${id}`),
  )

  const severityColor = (sev: Notice["severity"]) => {
    if (sev === "critical") return "danger"
    if (sev === "warning") return "warning"
    return "info"
  }

  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2">
        <Button colorScheme="accent" loading={loading()} onClick={refresh}>
          {t("global.refresh")}
        </Button>
        <Button onClick={() => to("/@manage/notices/add")}>
          {t("global.add")}
        </Button>
      </HStack>

      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <Th>{t("notices.title")}</Th>
              <Th>{t("notices.severity")}</Th>
              <Th>{t("notices.display_type")}</Th>
              <Th>{t("notices.path_prefix")}</Th>
              <Th>{t("notices.sort")}</Th>
              <Th>{t("notices.enabled")}</Th>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={items()}>
              {(item) => (
                <Tr>
                  <Td>{item.title}</Td>
                  <Td>
                    <Badge colorScheme={severityColor(item.severity)}>
                      {t(`notices.severities.${item.severity || "info"}`)}
                    </Badge>
                  </Td>
                  <Td>
                    {t(`notices.display_types.${item.display_type || "auto"}`)}
                  </Td>
                  <Td>{item.path_prefix || "/"}</Td>
                  <Td>{item.sort}</Td>
                  <Td>
                    <Wether yes={item.enabled} />
                  </Td>
                  <Td>
                    <HStack spacing="$2">
                      <Button
                        onClick={() => to(`/@manage/notices/edit/${item.id}`)}
                      >
                        {t("global.edit")}
                      </Button>
                      <DeletePopover
                        name={item.title}
                        loading={deleting() === item.id}
                        onClick={async () => {
                          const resp = await deleteItem(item.id)
                          handleResp(resp, () => {
                            notify.success(t("global.delete_success"))
                            loadPublicNotices()
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
    </VStack>
  )
}

export default Notices
