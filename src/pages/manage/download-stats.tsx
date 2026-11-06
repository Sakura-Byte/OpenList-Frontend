import {
  Anchor,
  Box,
  Button,
  ButtonGroup,
  Center,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@hope-ui/solid"
import { createMemo, createSignal, For, JSX, Show } from "solid-js"
import { FullLoading } from "~/components"
import { useFetch, useManageTitle, useT } from "~/hooks"
import { getMainColor } from "~/store"
import { PResp } from "~/types"
import { encodePath, getFileSize, handleResp, joinBase, r } from "~/utils"

type AuthorStat = {
  author: string
  count: number
  bytes: number
}

type SortKey = "count" | "bytes"

const AREA = "/3D"
const DAY_OPTIONS = [1, 7, 30, 90]
const LIMIT_OPTIONS = [50, 100, 500]

const Choice = <T extends number>(props: {
  options: T[]
  value: T
  label: (option: T) => string
  onChange: (option: T) => void
}) => (
  <ButtonGroup attached size="sm" variant="subtle">
    <For each={props.options}>
      {(option) => (
        <Button
          colorScheme={props.value === option ? "primary" : "neutral"}
          aria-pressed={props.value === option}
          onClick={() => props.onChange(option)}
        >
          {props.label(option)}
        </Button>
      )}
    </For>
  </ButtonGroup>
)

const Tile = (props: { label: string; value: string }) => (
  <VStack
    alignItems="flex-start"
    spacing="$1"
    p="$4"
    rounded="$lg"
    bgColor="$neutral3"
  >
    <Text size="sm" color="$neutral11">
      {props.label}
    </Text>
    <Text size="2xl" fontWeight="$semibold">
      {props.value}
    </Text>
  </VStack>
)

const SortHeader = (props: {
  active: boolean
  onClick: () => void
  children: JSX.Element
}) => (
  <Th
    aria-sort={props.active ? "descending" : "none"}
    css={{ cursor: "pointer", whiteSpace: "nowrap" }}
    onClick={props.onClick}
  >
    {props.children}
    {props.active ? " ↓" : ""}
  </Th>
)

const DownloadStats = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.download_stats")
  const [days, setDays] = createSignal(7)
  const [limit, setLimit] = createSignal(50)
  const [sortKey, setSortKey] = createSignal<SortKey>("count")
  const [search, setSearch] = createSignal("")
  const [rows, setRows] = createSignal<AuthorStat[]>([])
  const [loaded, setLoaded] = createSignal(false)
  const [loading, getStats] = useFetch((): PResp<AuthorStat[]> =>
    r.get("/admin/gd_download/top", {
      params: { prefix: AREA, days: days(), limit: limit() },
    }),
  )
  const refresh = async () => {
    const resp = await getStats()
    handleResp(resp, (data) => {
      setRows(data ?? [])
      setLoaded(true)
    })
  }
  refresh()

  const totalCount = createMemo(() =>
    rows().reduce((sum, row) => sum + row.count, 0),
  )
  const totalBytes = createMemo(() =>
    rows().reduce((sum, row) => sum + row.bytes, 0),
  )
  const sorted = createMemo(() => {
    const key = sortKey()
    return [...rows()].sort((a, b) => b[key] - a[key])
  })
  const barMax = createMemo(() =>
    Math.max(1, ...rows().map((row) => row[sortKey()])),
  )
  // rank stays the position in the full list while searching
  const visible = createMemo(() => {
    const keyword = search().trim().toLowerCase()
    return sorted()
      .map((row, index) => ({ row, rank: index + 1 }))
      .filter(({ row }) => row.author.toLowerCase().includes(keyword))
  })
  const share = (row: AuthorStat) => {
    const total = sortKey() === "count" ? totalCount() : totalBytes()
    return total > 0 ? `${((row[sortKey()] / total) * 100).toFixed(1)}%` : "0%"
  }

  return (
    <VStack w="$full" alignItems="stretch" spacing="$4">
      <VStack alignItems="flex-start" spacing="$1">
        <Heading size="lg">{t("manage.download_stats.title")}</Heading>
        <Text size="sm" color="$neutral11">
          {t("manage.download_stats.description")}
        </Text>
      </VStack>
      <HStack spacing="$3" flexWrap="wrap" rowGap="$2">
        <Choice
          options={DAY_OPTIONS}
          value={days()}
          label={(day) => t("manage.download_stats.days", { days: day })}
          onChange={(day) => {
            setDays(day)
            refresh()
          }}
        />
        <Choice
          options={LIMIT_OPTIONS}
          value={limit()}
          label={(count) => t("manage.download_stats.top", { count: count })}
          onChange={(count) => {
            setLimit(count)
            refresh()
          }}
        />
        <Input
          size="sm"
          maxW="$56"
          placeholder={t("manage.download_stats.search")}
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
        <Button
          size="sm"
          variant="subtle"
          loading={loading()}
          onClick={refresh}
        >
          {t("global.refresh")}
        </Button>
      </HStack>
      <SimpleGrid columns={{ "@initial": 1, "@sm": 3 }} gap="$3">
        <Tile
          label={t("manage.download_stats.authors")}
          value={rows().length.toLocaleString()}
        />
        <Tile
          label={t("manage.download_stats.downloads")}
          value={totalCount().toLocaleString()}
        />
        <Tile
          label={t("manage.download_stats.estimated")}
          value={getFileSize(totalBytes())}
        />
      </SimpleGrid>
      <Show when={loaded()} fallback={<FullLoading />}>
        <Show
          when={visible().length > 0}
          fallback={
            <Center py="$10">
              <Text color="$neutral11">
                {rows().length > 0
                  ? t("manage.download_stats.no_match")
                  : t("manage.download_stats.empty")}
              </Text>
            </Center>
          }
        >
          <Box w="$full" overflowX="auto">
            <Table dense highlightOnHover>
              <Thead>
                <Tr>
                  <Th>#</Th>
                  <Th>{t("manage.download_stats.author")}</Th>
                  <SortHeader
                    active={sortKey() === "count"}
                    onClick={() => setSortKey("count")}
                  >
                    {t("manage.download_stats.downloads")}
                  </SortHeader>
                  <SortHeader
                    active={sortKey() === "bytes"}
                    onClick={() => setSortKey("bytes")}
                  >
                    {t("manage.download_stats.estimated")}
                  </SortHeader>
                  <Th css={{ minWidth: "160px" }}>
                    {t("manage.download_stats.share")}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                <For each={visible()}>
                  {({ row, rank }) => (
                    <Tr>
                      <Td color="$neutral11">{rank}</Td>
                      <Td css={{ minWidth: "180px", overflowWrap: "anywhere" }}>
                        <Anchor
                          href={joinBase(
                            encodePath(`${AREA}/${row.author}`, true),
                          )}
                          external
                          px="$0"
                        >
                          {row.author}
                        </Anchor>
                      </Td>
                      <Td css={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.count.toLocaleString()}
                      </Td>
                      <Td css={{ whiteSpace: "nowrap" }}>
                        {getFileSize(row.bytes)}
                      </Td>
                      <Td>
                        <HStack spacing="$2" title={share(row)}>
                          <Box
                            flex="1"
                            h="$2"
                            minW="$16"
                            rounded="$full"
                            bgColor="$neutral4"
                            overflow="hidden"
                          >
                            <Box
                              h="$full"
                              rounded="$full"
                              bgColor={getMainColor()}
                              style={{
                                width: `${(row[sortKey()] / barMax()) * 100}%`,
                              }}
                            />
                          </Box>
                          <Text
                            size="sm"
                            color="$neutral11"
                            css={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {share(row)}
                          </Text>
                        </HStack>
                      </Td>
                    </Tr>
                  )}
                </For>
              </Tbody>
            </Table>
          </Box>
        </Show>
      </Show>
    </VStack>
  )
}

export default DownloadStats
