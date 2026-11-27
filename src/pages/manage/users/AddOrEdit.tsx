import { Button, Checkbox, FormControl, FormLabel, Input } from "@hope-ui/solid"
import { TbArrowLeft, TbDeviceFloppy } from "solid-icons/tb"
import { createMemo, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { FolderChooseInput, MaybeLoading } from "~/components"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { Me, me, setMe } from "~/store"
import { PEmptyResp, PResp, User, UserMethods, UserPermissions } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { PublicKeys } from "./PublicKeys"

const PermissionItem = (props: {
  can: boolean
  onChange: (val: boolean) => void
  name: string
}) => {
  const t = useT()
  return (
    <label
      style={{
        display: "flex",
        "align-items": "center",
        gap: "10px",
        padding: "9px 12px",
        "border-radius": "var(--ol-radius-sm)",
        border: props.can
          ? "1px solid color-mix(in oklab, var(--ol-accent) 32%, var(--ol-border))"
          : "1px solid var(--ol-border)",
        background: props.can
          ? "var(--ol-accent-soft)"
          : "var(--ol-surface-card)",
        cursor: "pointer",
        "user-select": "none",
        transition: "border-color 0.12s ease, background-color 0.12s ease",
      }}
    >
      <Checkbox
        checked={props.can}
        onChange={() => props.onChange(!props.can)}
      />
      <span
        style={{
          "font-size": "13px",
          color: "var(--ol-text-primary)",
          "line-height": "1.35",
        }}
      >
        {t(`users.permissions.${props.name}`)}
      </span>
    </label>
  )
}

const AddOrEdit = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.users")
  const { params, to } = useRouter()
  const { id } = params
  const [user, setUser] = createStore<User>({
    id: 0,
    username: "",
    password: "",
    base_path: "",
    role: 0,
    permission: 0,
    disabled: false,
    sso_id: "",
    download_rps: null,
    download_concurrency: null,
    list_rps: null,
    search_rps: null,
    allow_ldap: false,
  })
  const [userLoading, loadUser] = useFetch((): PResp<User> =>
    r.get(`/admin/user/get?id=${id}`),
  )

  const initEdit = async () => {
    const resp = await loadUser()
    handleResp<User>(resp, setUser)
  }
  if (id) {
    initEdit()
  }
  const [okLoading, ok] = useFetch((): PEmptyResp => {
    return r.post(`/admin/user/${id ? "update" : "create"}`, user)
  })

  const grantedCount = createMemo(
    () => UserPermissions.filter((_, i) => UserMethods.can(user, i)).length,
  )

  return (
    <MaybeLoading loading={userLoading()}>
      <div class="ol-admin-page">
        <div class="ol-admin-head">
          <div class="ol-admin-head__main">
            <h1 class="ol-admin-title">{t(`global.${id ? "edit" : "add"}`)}</h1>
            <p class="ol-admin-subtitle">{t("manage.sidemenu.users")}</p>
          </div>
          <div class="ol-admin-head__actions">
            <button
              type="button"
              class="ol-btn"
              onClick={() => to("/@manage/users")}
            >
              <TbArrowLeft size={15} class="ol-ico" />
              <span>{t("global.back")}</span>
            </button>
          </div>
        </div>

        {/* Account & Path */}
        <section class="ol-admin-card">
          <div class="ol-admin-form-stack">
            <Show when={!UserMethods.is_guest(user)}>
              <div class="ol-admin-form-grid">
                <FormControl required>
                  <FormLabel for="username">{t("users.username")}</FormLabel>
                  <Input
                    id="username"
                    value={user.username}
                    onInput={(e) => setUser("username", e.currentTarget.value)}
                  />
                </FormControl>

                <FormControl required>
                  <FormLabel for="password">{t("users.password")}</FormLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    value={user.password}
                    onInput={(e) => setUser("password", e.currentTarget.value)}
                  />
                </FormControl>
              </div>
            </Show>

            <FormControl w="$full" required>
              <FormLabel for="base_path">{t("users.base_path")}</FormLabel>
              <FolderChooseInput
                id="base_path"
                value={user.base_path}
                onChange={(path) => setUser("base_path", path)}
                onlyFolder
              />
            </FormControl>

            <div
              style={{
                display: "flex",
                "align-items": "center",
                "flex-wrap": "wrap",
                gap: "18px",
                "padding-top": "4px",
              }}
            >
              <Checkbox
                id="disabled"
                checked={user.disabled}
                onChange={(e: any) =>
                  setUser("disabled", e.currentTarget.checked)
                }
              >
                {t("users.disabled")}
              </Checkbox>

              <Checkbox
                id="allow_ldap"
                checked={user.allow_ldap}
                onChange={(e: any) =>
                  setUser("allow_ldap", e.currentTarget.checked)
                }
              >
                {t("users.allow_ldap")}
              </Checkbox>
            </div>
          </div>
        </section>

        {/* Permissions Grid */}
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <h2 class="ol-admin-card__title">{t("users.permission")}</h2>
            <span class="ol-pill ol-tabular">
              {grantedCount()} / {UserPermissions.length}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              "grid-template-columns":
                "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
              gap: "8px",
            }}
          >
            <For each={UserPermissions}>
              {(item, i) => (
                <PermissionItem
                  name={item}
                  can={UserMethods.can(user, i())}
                  onChange={(val) => {
                    const next = val
                      ? user.permission | (1 << i())
                      : user.permission & ~(1 << i())
                    setUser("permission", next)
                  }}
                />
              )}
            </For>
          </div>
        </section>

        {/* Rate Limits */}
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <h2 class="ol-admin-card__title">{t("users.rate_limit")}</h2>
          </div>
          <div class="ol-admin-form-grid">
            <FormControl>
              <FormLabel for="download_concurrency">
                {t("users.download_concurrency")}
              </FormLabel>
              <Input
                id="download_concurrency"
                type="number"
                step="1"
                class="ol-tabular"
                placeholder={t("users.concurrency_placeholder")}
                value={user.download_concurrency ?? ""}
                onInput={(e) => {
                  const val = e.currentTarget.value
                  setUser(
                    "download_concurrency",
                    val === "" ? null : parseInt(val),
                  )
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel for="download_rps">
                {t("users.download_rps")}
              </FormLabel>
              <Input
                id="download_rps"
                type="number"
                step="0.1"
                class="ol-tabular"
                placeholder={t("users.rps_placeholder")}
                value={user.download_rps ?? ""}
                onInput={(e) => {
                  const val = e.currentTarget.value
                  setUser("download_rps", val === "" ? null : parseFloat(val))
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel for="list_rps">{t("users.list_rps")}</FormLabel>
              <Input
                id="list_rps"
                type="number"
                step="0.1"
                class="ol-tabular"
                placeholder={t("users.rps_placeholder")}
                value={user.list_rps ?? ""}
                onInput={(e) => {
                  const val = e.currentTarget.value
                  setUser("list_rps", val === "" ? null : parseFloat(val))
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel for="search_rps">{t("users.search_rps")}</FormLabel>
              <Input
                id="search_rps"
                type="number"
                step="0.1"
                class="ol-tabular"
                placeholder={t("users.rps_placeholder")}
                value={user.search_rps ?? ""}
                onInput={(e) => {
                  const val = e.currentTarget.value
                  setUser("search_rps", val === "" ? null : parseFloat(val))
                }}
              />
            </FormControl>
          </div>
        </section>

        <Show when={id && !UserMethods.is_guest(user)}>
          <PublicKeys isMine={false} userId={parseInt(id)} />
        </Show>

        <div class="ol-sticky-actions">
          <button
            type="button"
            class="ol-btn"
            onClick={() => to("/@manage/users")}
          >
            <span>{t("global.cancel")}</span>
          </button>
          <Button
            colorScheme="accent"
            loading={okLoading()}
            onClick={async () => {
              const resp = await ok()
              handleResp(resp, async () => {
                notify.success(t("global.save_success"))
                if (user.username === me().username)
                  handleResp(await (r.get("/me") as PResp<Me>), setMe)
                to("/@manage/users", false, { replace: true })
              })
            }}
          >
            <TbDeviceFloppy
              size={15}
              class="ol-ico"
              style={{ "margin-right": "5px" }}
            />
            {t(`global.${id ? "save" : "add"}`)}
          </Button>
        </div>
      </div>
    </MaybeLoading>
  )
}

export default AddOrEdit
