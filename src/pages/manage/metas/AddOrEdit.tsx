import {
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Input,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
  Switch as HopeSwitch,
  Textarea,
  VStack,
} from "@hope-ui/solid"
import { For, Show, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { FolderChooseInput, MaybeLoading } from "~/components"
import { useFetch, useRouter, useT } from "~/hooks"
import { Meta, PEmptyResp, PPageResp, PResp, User } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { formatArchivePasswordsText, parseArchivePasswordsText } from "./Metas"

type ItemProps = {
  name: string
  sub?: boolean
  onSub?: (val: boolean) => void
  help?: boolean
} & (
  | { type: "string"; value: string; onChange: (val: string) => void }
  | { type: "text"; value: string; onChange: (val: string) => void }
  | { type: "bool"; value: boolean; onChange: (val: boolean) => void }
  | { type: "users"; value: number[]; onChange: (val: number[]) => void }
)

const AddOrEdit = () => {
  const Item = (props: ItemProps) => {
    const t = useT()
    return (
      <FormControl w="$full" display="flex" flexDirection="column">
        <FormLabel for={props.name} display="flex" alignItems="center">
          {t(`metas.${props.name}`)}
        </FormLabel>
        <Flex
          w="$full"
          direction={
            props.type === "bool"
              ? "row"
              : { "@initial": "column", "@md": "row" }
          }
          gap="$2"
        >
          {props.type === "string" ? (
            <Input
              id={props.name}
              value={props.value}
              onInput={(e) => props.onChange(e.currentTarget.value)}
            />
          ) : props.type === "bool" ? (
            <HopeSwitch
              id={props.name}
              checked={props.value}
              onChange={(e: any) => props.onChange(e.currentTarget.checked)}
            />
          ) : props.type === "text" ? (
            <Textarea
              id={props.name}
              value={props.value}
              onInput={(e) => props.onChange(e.currentTarget.value)}
            />
          ) : props.type === "users" ? (
            <Select
              value={props.value}
              multiple
              onChange={(value: any) => props.onChange(value)}
            >
              <SelectTrigger>
                <SelectPlaceholder>
                  {t(`metas.all_permitted_users`)}
                </SelectPlaceholder>
                <SelectValue />
                <SelectIcon />
              </SelectTrigger>
              <SelectContent>
                <SelectListbox>
                  <For each={users()}>
                    {(item) => (
                      <SelectOption value={item.id}>
                        <SelectOptionText>{item.username}</SelectOptionText>
                        <SelectOptionIndicator />
                      </SelectOption>
                    )}
                  </For>
                </SelectListbox>
              </SelectContent>
            </Select>
          ) : null}
          <Show when={props.onSub}>
            <FormControl w="fit-content" display="flex">
              <Checkbox
                css={{ whiteSpace: "nowrap" }}
                id={`${props.name}_sub`}
                onChange={(e: any) => props.onSub?.(e.currentTarget.checked)}
                color="$neutral10"
                fontSize="$sm"
                checked={props.sub}
              >
                {t("metas.apply_sub")}
              </Checkbox>
            </FormControl>
          </Show>
        </Flex>
        <Show when={props.help}>
          <FormHelperText>{t(`metas.${props.name}_help`)}</FormHelperText>
        </Show>
      </FormControl>
    )
  }

  const t = useT()
  const { params, to } = useRouter()
  const { id } = params
  const [meta, setMeta] = createStore<Meta>({
    id: 0,
    path: "",
    read_users: [],
    read_users_sub: false,
    write_users: [],
    write_users_sub: false,
    password: "",
    p_sub: false,
    write: false,
    w_sub: false,
    hide: "",
    h_sub: false,
    readme: "",
    r_sub: false,
    header: "",
    header_sub: false,
    source_note: "",
    source_sub: false,
    archive_passwords: [],
    archive_passwords_sub: false,
    stop_header: false,
    stop_readme: false,
  })
  const [passwordsText, setPasswordsText] = createSignal("")

  const [metaLoading, loadMeta] = useFetch((): PResp<Meta> =>
    r.get(`/admin/meta/get?id=${id}`),
  )
  const [users, setUsers] = createSignal<User[]>([])
  const [getUsersLoading, getUsers] = useFetch((): PPageResp<User> =>
    r.get("/admin/user/list"),
  )

  const initEdit = async () => {
    const respMeta = await loadMeta()
    handleResp<Meta>(respMeta, (data) => {
      setMeta({
        ...data,
        source_note: data.source_note ?? "",
        archive_passwords: data.archive_passwords ?? [],
      })
      setPasswordsText(formatArchivePasswordsText(data.archive_passwords))
    })
  }
  const initUsers = async () => {
    const respUsers = await getUsers()
    handleResp(respUsers, (data) => setUsers(data.content))
  }

  if (id) {
    initEdit()
  }
  initUsers()

  const [okLoading, ok] = useFetch((): PEmptyResp => {
    return r.post(`/admin/meta/${id ? "update" : "create"}`, {
      ...meta,
      archive_passwords: parseArchivePasswordsText(passwordsText()),
    })
  })

  return (
    <MaybeLoading loading={metaLoading() || getUsersLoading()}>
      <VStack w="$full" alignItems="start" spacing="$2">
        <Heading>{t(`global.${id ? "edit" : "add"}`)}</Heading>
        <FormControl w="$full" display="flex" flexDirection="column" required>
          <FormLabel for="path" display="flex" alignItems="center">
            {t(`metas.path`)}
          </FormLabel>
          <FolderChooseInput
            id="path"
            value={meta.path}
            onChange={(path) => setMeta("path", path)}
          />
        </FormControl>

        <For
          each={
            [
              { name: "password", type: "string", sub: "p_sub" },
              {
                name: "read_users",
                type: "users",
                sub: "read_users_sub",
                help: true,
              },
              {
                name: "write_users",
                type: "users",
                sub: "write_users_sub",
                help: true,
              },
              { name: "write", type: "bool", sub: "w_sub", help: true },
              { name: "hide", type: "text", sub: "h_sub", help: true },
              {
                name: "source_note",
                type: "string",
                sub: "source_sub",
                help: true,
              },
            ] as const
          }
        >
          {(item) => (
            // @ts-ignore
            <Item
              name={item.name}
              type={item.type}
              value={meta[item.name]}
              onChange={(val: any): void => setMeta(item.name, val)}
              sub={meta[item.sub]}
              onSub={(val): void => setMeta(item.sub, val)}
              help={(item as { help: boolean }).help}
            />
          )}
        </For>

        <Item
          name="archive_passwords"
          type="text"
          value={passwordsText()}
          onChange={(val) => setPasswordsText(val)}
          sub={meta.archive_passwords_sub}
          onSub={(val) => setMeta("archive_passwords_sub", val)}
          help
        />

        <Item
          name="header"
          type="text"
          value={meta.header}
          onChange={(val) => setMeta("header", val)}
          sub={meta.header_sub}
          onSub={(val) => setMeta("header_sub", val)}
          help
        />

        <FormControl w="$full">
          <HStack spacing="$2">
            <HopeSwitch
              id="stop_header"
              checked={meta.stop_header}
              onChange={(e: any) =>
                setMeta("stop_header", e.currentTarget.checked)
              }
            />
            <FormLabel for="stop_header" mb="0">
              {t("metas.stop_header")}
            </FormLabel>
          </HStack>
          <FormHelperText>{t("metas.stop_header_help")}</FormHelperText>
        </FormControl>

        <Item
          name="readme"
          type="text"
          value={meta.readme}
          onChange={(val) => setMeta("readme", val)}
          sub={meta.r_sub}
          onSub={(val) => setMeta("r_sub", val)}
          help
        />

        <FormControl w="$full">
          <HStack spacing="$2">
            <HopeSwitch
              id="stop_readme"
              checked={meta.stop_readme}
              onChange={(e: any) =>
                setMeta("stop_readme", e.currentTarget.checked)
              }
            />
            <FormLabel for="stop_readme" mb="0">
              {t("metas.stop_readme")}
            </FormLabel>
          </HStack>
          <FormHelperText>{t("metas.stop_readme_help")}</FormHelperText>
        </FormControl>

        <Button
          loading={okLoading()}
          onClick={async () => {
            const resp = await ok()
            handleResp(resp, () => {
              notify.success(t("global.save_success"))
              to("/@manage/metas", false, { replace: true })
            })
          }}
        >
          {t(`global.${id ? "save" : "add"}`)}
        </Button>
      </VStack>
    </MaybeLoading>
  )
}

export default AddOrEdit
