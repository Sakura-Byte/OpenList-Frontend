import {
  Checkbox,
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
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
  Switch as HopeSwitch,
  Textarea,
} from "@hope-ui/solid"
import {
  TbArrowLeft,
  TbCheck,
  TbChevronDown,
  TbChevronRight,
} from "solid-icons/tb"
import { createSignal, For, JSX, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { FolderChooseInput, MaybeLoading } from "~/components"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { Meta, PEmptyResp, PPageResp, PResp, User } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { formatArchivePasswordsText, parseArchivePasswordsText } from "./Metas"

type FieldItemProps = {
  name: string
  sub?: boolean
  onSub?: (val: boolean) => void
  help?: boolean
  rows?: number
  users?: User[]
} & (
  | { type: "string"; value: string; onChange: (val: string) => void }
  | { type: "text"; value: string; onChange: (val: string) => void }
  | { type: "bool"; value: boolean; onChange: (val: boolean) => void }
  | { type: "users"; value: number[]; onChange: (val: number[]) => void }
)

const MetaFieldItem = (props: FieldItemProps) => {
  const t = useT()
  return (
    <FormControl w="$full" display="flex" flexDirection="column">
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          "flex-wrap": "wrap",
          gap: "6px 12px",
          "margin-bottom": "5px",
        }}
      >
        <FormLabel for={props.name} mb="0" display="flex" alignItems="center">
          {t(`metas.${props.name}`)}
        </FormLabel>
        <Show when={props.onSub}>
          <Checkbox
            css={{ whiteSpace: "nowrap" }}
            id={`${props.name}_sub`}
            onChange={(e: any) => props.onSub?.(e.currentTarget.checked)}
            fontSize="$sm"
            checked={props.sub}
          >
            {t("metas.apply_sub")}
          </Checkbox>
        </Show>
      </div>

      {props.type === "string" ? (
        <Input
          id={props.name}
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
        />
      ) : props.type === "bool" ? (
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "min-height": "36px",
          }}
        >
          <HopeSwitch
            id={props.name}
            checked={props.value}
            onChange={(e: any) => props.onChange(e.currentTarget.checked)}
          />
        </div>
      ) : props.type === "text" ? (
        <Textarea
          id={props.name}
          rows={props.rows ?? 3}
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
              {t("metas.all_permitted_users")}
            </SelectPlaceholder>
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectListbox>
              <For each={props.users ?? []}>
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

      <Show when={props.help}>
        <FormHelperText>{t(`metas.${props.name}_help`)}</FormHelperText>
      </Show>
    </FormControl>
  )
}

const CollapsibleCard = (props: {
  title: string
  defaultOpen?: boolean
  children: JSX.Element
}) => {
  const [open, setOpen] = createSignal(props.defaultOpen ?? true)
  return (
    <section class="ol-admin-card">
      <button
        type="button"
        aria-expanded={open()}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          gap: "10px",
          padding: "0",
          margin: open() ? "0 0 14px" : "0",
          border: "0",
          background: "transparent",
          cursor: "pointer",
          "text-align": "left",
        }}
      >
        <h2 class="ol-admin-card__title">{props.title}</h2>
        <span class="ol-icon-btn" style={{ "pointer-events": "none" }}>
          {open() ? (
            <TbChevronDown size={16} class="ol-ico" />
          ) : (
            <TbChevronRight size={16} class="ol-ico" />
          )}
        </span>
      </button>
      <Show when={open()}>{props.children}</Show>
    </section>
  )
}

const AddOrEdit = () => {
  const t = useT()
  const { params, to } = useRouter()
  const { id } = params
  useManageTitle(`global.${id ? "edit" : "add"}`)

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
    handleResp(respUsers, (data) => setUsers(data.content ?? []))
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
      <div class="ol-admin-page">
        <div class="ol-admin-head">
          <div class="ol-admin-head__main">
            <h1 class="ol-admin-title">
              {t(`global.${id ? "edit" : "add"}`)} —{" "}
              {t("manage.sidemenu.metas")}
            </h1>
            <Show when={meta.path}>
              <p
                class="ol-admin-subtitle"
                style={{ "font-family": "var(--ol-font-mono)" }}
              >
                {meta.path}
              </p>
            </Show>
          </div>
          <div class="ol-admin-head__actions">
            <button
              type="button"
              class="ol-btn ol-btn--ghost"
              onClick={() => to("/@manage/metas")}
            >
              <TbArrowLeft size={15} class="ol-ico" />
              <span>{t("global.back")}</span>
            </button>
          </div>
        </div>

        {/* Group 1: Path & Access / Hide rules */}
        <CollapsibleCard
          title={`${t("metas.path")} · ${t("metas.password")} · ${t("metas.hide")}`}
        >
          <div class="ol-admin-form-stack">
            <FormControl
              w="$full"
              display="flex"
              flexDirection="column"
              required
            >
              <FormLabel for="path" display="flex" alignItems="center">
                {t("metas.path")}
              </FormLabel>
              <FolderChooseInput
                id="path"
                value={meta.path}
                onChange={(path) => setMeta("path", path)}
              />
            </FormControl>

            <div class="ol-admin-form-grid">
              <MetaFieldItem
                name="password"
                type="string"
                value={meta.password}
                onChange={(val) => setMeta("password", val)}
                sub={meta.p_sub}
                onSub={(val) => setMeta("p_sub", val)}
              />
              <MetaFieldItem
                name="write"
                type="bool"
                value={meta.write}
                onChange={(val) => setMeta("write", val)}
                sub={meta.w_sub}
                onSub={(val) => setMeta("w_sub", val)}
                help
              />
              <MetaFieldItem
                name="read_users"
                type="users"
                users={users()}
                value={meta.read_users}
                onChange={(val) => setMeta("read_users", val)}
                sub={meta.read_users_sub}
                onSub={(val) => setMeta("read_users_sub", val)}
                help
              />
              <MetaFieldItem
                name="write_users"
                type="users"
                users={users()}
                value={meta.write_users}
                onChange={(val) => setMeta("write_users", val)}
                sub={meta.write_users_sub}
                onSub={(val) => setMeta("write_users_sub", val)}
                help
              />
            </div>

            <MetaFieldItem
              name="hide"
              type="text"
              rows={3}
              value={meta.hide}
              onChange={(val) => setMeta("hide", val)}
              sub={meta.h_sub}
              onSub={(val) => setMeta("h_sub", val)}
              help
            />
          </div>
        </CollapsibleCard>

        {/* Group 2: Source Note & Archive Passwords */}
        <CollapsibleCard
          title={`${t("metas.source_note")} · ${t("metas.archive_passwords")}`}
        >
          <div class="ol-admin-form-stack">
            <MetaFieldItem
              name="source_note"
              type="string"
              value={meta.source_note}
              onChange={(val) => setMeta("source_note", val)}
              sub={meta.source_sub}
              onSub={(val) => setMeta("source_sub", val)}
              help
            />
            <MetaFieldItem
              name="archive_passwords"
              type="text"
              rows={3}
              value={passwordsText()}
              onChange={(val) => setPasswordsText(val)}
              sub={meta.archive_passwords_sub}
              onSub={(val) => setMeta("archive_passwords_sub", val)}
              help
            />
          </div>
        </CollapsibleCard>

        {/* Group 3: Header & README Markdown */}
        <CollapsibleCard title={`${t("metas.header")} · ${t("metas.readme")}`}>
          <div class="ol-admin-form-stack">
            <MetaFieldItem
              name="header"
              type="text"
              rows={4}
              value={meta.header}
              onChange={(val) => setMeta("header", val)}
              sub={meta.header_sub}
              onSub={(val) => setMeta("header_sub", val)}
              help
            />

            <FormControl w="$full">
              <div
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "10px",
                }}
              >
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
              </div>
              <FormHelperText>{t("metas.stop_header_help")}</FormHelperText>
            </FormControl>

            <MetaFieldItem
              name="readme"
              type="text"
              rows={5}
              value={meta.readme}
              onChange={(val) => setMeta("readme", val)}
              sub={meta.r_sub}
              onSub={(val) => setMeta("r_sub", val)}
              help
            />

            <FormControl w="$full">
              <div
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "10px",
                }}
              >
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
              </div>
              <FormHelperText>{t("metas.stop_readme_help")}</FormHelperText>
            </FormControl>
          </div>
        </CollapsibleCard>

        <div class="ol-sticky-actions">
          <button
            type="button"
            class="ol-btn"
            disabled={okLoading()}
            onClick={() => to("/@manage/metas")}
          >
            <span>{t("global.cancel")}</span>
          </button>
          <button
            type="button"
            class="ol-btn ol-btn--primary"
            disabled={okLoading()}
            onClick={async () => {
              const resp = await ok()
              handleResp(resp, () => {
                notify.success(t("global.save_success"))
                to("/@manage/metas", false, { replace: true })
              })
            }}
          >
            <TbCheck size={15} class="ol-ico" />
            <span>{t(`global.${id ? "save" : "add"}`)}</span>
          </button>
        </div>
      </div>
    </MaybeLoading>
  )
}

export default AddOrEdit
