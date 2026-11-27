import { Button, Tooltip } from "@hope-ui/solid"
import {
  TbCheck,
  TbEdit,
  TbMinus,
  TbPlus,
  TbRefresh,
  TbSearch,
  TbShieldCheck,
  TbShieldOff,
} from "solid-icons/tb"
import { createMemo, createSignal, For, Show } from "solid-js"
import {
  useFetch,
  useListFetch,
  useManageTitle,
  useRouter,
  useT,
} from "~/hooks"
import {
  PEmptyResp,
  PPageResp,
  User,
  UserMethods,
  UserPermissions,
} from "~/types"
import { handleResp, notify, r } from "~/utils"
import { DeletePopover } from "../common/DeletePopover"

const ROLES = ["general", "guest", "admin"] as const

const Role = (props: { role: number }) => {
  const t = useT()
  const roleName = () => ROLES[props.role] ?? "general"
  return (
    <span
      class="ol-pill"
      data-tone={roleName() === "admin" ? "accent" : undefined}
    >
      {t(`users.roles.${roleName()}`)}
    </span>
  )
}

const Permissions = (props: { user: User }) => {
  const t = useT()
  const grantedCount = createMemo(
    () =>
      UserPermissions.filter((_, i) => UserMethods.can(props.user, i)).length,
  )

  return (
    <Tooltip
      label={
        <div
          style={{
            display: "flex",
            "flex-direction": "column",
            gap: "3px",
            padding: "4px 2px",
            "max-width": "280px",
            "font-size": "12px",
            "line-height": "1.35",
          }}
        >
          <For each={UserPermissions}>
            {(item, i) => {
              const can = () => UserMethods.can(props.user, i())
              return (
                <div
                  style={{
                    display: "flex",
                    "align-items": "center",
                    gap: "6px",
                    opacity: can() ? 1 : 0.55,
                  }}
                >
                  {can() ? (
                    <TbCheck
                      size={13}
                      class="ol-ico"
                      style={{ "flex-shrink": 0 }}
                    />
                  ) : (
                    <TbMinus
                      size={13}
                      class="ol-ico"
                      style={{ "flex-shrink": 0 }}
                    />
                  )}
                  <span>{t(`users.permissions.${item}`)}</span>
                </div>
              )
            }}
          </For>
        </div>
      }
    >
      <span class="ol-pill ol-tabular" style={{ cursor: "default" }}>
        <TbShieldCheck size={13} class="ol-ico" />
        <span>
          {grantedCount()} / {UserPermissions.length}
        </span>
      </span>
    </Tooltip>
  )
}

const Users = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.users")
  const { to } = useRouter()
  const [getUsersLoading, getUsers] = useFetch((): PPageResp<User> =>
    r.get("/admin/user/list"),
  )
  const [users, setUsers] = createSignal<User[]>([])
  const [search, setSearch] = createSignal("")

  const refresh = async () => {
    const resp = await getUsers()
    handleResp(resp, (data) => setUsers(data.content))
  }
  refresh()

  const [deleting, deleteUser] = useListFetch((id: number): PEmptyResp =>
    r.post(`/admin/user/delete?id=${id}`),
  )
  const [cancel_2faId, cancel_2fa] = useListFetch((id: number): PEmptyResp =>
    r.post(`/admin/user/cancel_2fa?id=${id}`),
  )

  const filteredUsers = createMemo(() => {
    const q = search().trim().toLowerCase()
    if (!q) return users()
    return users().filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        (u.base_path || "/").toLowerCase().includes(q),
    )
  })

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.sidemenu.users")}</h1>
        </div>
        <div class="ol-admin-head__actions">
          <button
            type="button"
            class="ol-btn"
            disabled={getUsersLoading()}
            onClick={refresh}
          >
            <TbRefresh size={15} class="ol-ico" />
            <span>{t("global.refresh")}</span>
          </button>
          <button
            type="button"
            class="ol-btn ol-btn--primary"
            onClick={() => to("/@manage/users/add")}
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
              placeholder={t("manage.common.search")}
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>
        </div>
        <div class="ol-admin-toolbar__right">
          <span class="ol-pill ol-tabular">
            {filteredUsers().length} / {users().length}
          </span>
        </div>
      </div>

      <div class="ol-admin-table-wrap">
        <Show
          when={filteredUsers().length > 0}
          fallback={
            <div class="ol-admin-empty">
              {users().length > 0
                ? t("manage.common.no_results")
                : t("manage.common.no_data")}
            </div>
          }
        >
          <table class="ol-admin-table">
            <thead>
              <tr>
                <For
                  each={[
                    "username",
                    "base_path",
                    "role",
                    "permission",
                    "available",
                  ]}
                >
                  {(title) => <th>{t(`users.${title}`)}</th>}
                </For>
                <th>{t("global.operations")}</th>
              </tr>
            </thead>
            <tbody>
              <For each={filteredUsers()}>
                {(user) => (
                  <tr>
                    <td style={{ "font-weight": 550 }}>{user.username}</td>
                    <td>
                      <code
                        style={{
                          "font-family": "var(--ol-font-mono)",
                          "font-size": "12.5px",
                          color: "var(--ol-text-secondary)",
                        }}
                      >
                        {user.base_path || "/"}
                      </code>
                    </td>
                    <td>
                      <Role role={user.role} />
                    </td>
                    <td>
                      <Permissions user={user} />
                    </td>
                    <td>
                      <span class="ol-status">
                        <span
                          class="ol-status-dot"
                          data-status={user.disabled ? "disabled" : "work"}
                        />
                        <span>
                          {t(
                            user.disabled
                              ? "manage.common.disabled"
                              : "manage.common.enabled",
                          )}
                        </span>
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "inline-flex",
                          "align-items": "center",
                          gap: "6px",
                          "white-space": "nowrap",
                        }}
                      >
                        <Button
                          onClick={() => to(`/@manage/users/edit/${user.id}`)}
                        >
                          <TbEdit
                            size={14}
                            class="ol-ico"
                            style={{ "margin-right": "4px" }}
                          />
                          {t("global.edit")}
                        </Button>
                        <DeletePopover
                          name={user.username}
                          loading={deleting() === user.id}
                          onClick={async () => {
                            const resp = await deleteUser(user.id)
                            handleResp(resp, () => {
                              notify.success(t("global.delete_success"))
                              refresh()
                            })
                          }}
                        />
                        <Button
                          loading={cancel_2faId() === user.id}
                          onClick={async () => {
                            const resp = await cancel_2fa(user.id)
                            handleResp(resp, () => {
                              notify.success(t("users.cancel_2fa_success"))
                              refresh()
                            })
                          }}
                        >
                          <TbShieldOff
                            size={14}
                            class="ol-ico"
                            style={{ "margin-right": "4px" }}
                          />
                          {t("users.cancel_2fa")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>
    </div>
  )
}

export default Users
