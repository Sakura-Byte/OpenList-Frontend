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
import { loadPublicPromotions } from "~/store"
import { PEmptyResp, Promotion, Resp } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { DeletePopover } from "../common/DeletePopover"

const Promotions = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.promotions")
  const { to } = useRouter()
  const [items, setItems] = createSignal<Promotion[]>([])

  const [loading, fetchList] = useFetch(
    (): Promise<Resp<{ content: Promotion[]; total: number } | Promotion[]>> =>
      r.get("/admin/promotion/list"),
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
    r.post(`/admin/promotion/delete?id=${id}`),
  )

  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2">
        <Button colorScheme="accent" loading={loading()} onClick={refresh}>
          {t("global.refresh")}
        </Button>
        <Button onClick={() => to("/@manage/promotions/add")}>
          {t("global.add")}
        </Button>
      </HStack>

      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <Th>{t("promotions.slot")}</Th>
              <Th>{t("promotions.title")}</Th>
              <Th>{t("promotions.path_prefix")}</Th>
              <Th>{t("promotions.freq_cap")}</Th>
              <Th>{t("promotions.priority")}</Th>
              <Th>{t("promotions.enabled")}</Th>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={items()}>
              {(item) => (
                <Tr>
                  <Td>
                    <Badge colorScheme="neutral">
                      {t(`promotions.slots.${item.slot || "header_banner"}`)}
                    </Badge>
                  </Td>
                  <Td>{item.title}</Td>
                  <Td>{item.path_prefix || "/"}</Td>
                  <Td>
                    {t(`promotions.freq_caps.${item.freq_cap || "session"}`)}
                  </Td>
                  <Td>{item.priority}</Td>
                  <Td>
                    <Wether yes={item.enabled} />
                  </Td>
                  <Td>
                    <HStack spacing="$2">
                      <Button
                        onClick={() =>
                          to(`/@manage/promotions/edit/${item.id}`)
                        }
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
                            loadPublicPromotions()
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

export default Promotions
