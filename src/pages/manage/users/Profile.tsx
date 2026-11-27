import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
} from "@hope-ui/solid"
import {
  TbAlertTriangle,
  TbDeviceFloppy,
  TbFingerprint,
  TbLink,
  TbLinkOff,
  TbLogin,
  TbPlus,
  TbShieldLock,
} from "solid-icons/tb"
import {
  createMemo,
  createSignal,
  For,
  JSXElement,
  onCleanup,
  Show,
} from "solid-js"
import { LinkWithBase, MaybeLoading } from "~/components"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { getSettingBool, me, setMe } from "~/store"
import { PEmptyResp, PResp, UserMethods, UserPermissions } from "~/types"
import { handleResp, handleRespWithoutNotify, notify, r } from "~/utils"
import { PublicKeys } from "./PublicKeys"
import { WebauthnItem } from "./Webauthnitems"

const ROLES = ["general", "guest", "admin"] as const

const supported = () =>
  !!globalThis.PublicKeyCredential?.parseCreationOptionsFromJSON

const PermissionPill = (props: { can: boolean; children: JSXElement }) => (
  <span
    class="ol-pill"
    style={{
      height: "26px",
      padding: "0 10px",
      opacity: props.can ? 1 : 0.65,
    }}
  >
    <span class="ol-status-dot" data-status={props.can ? "work" : "disabled"} />
    <span>{props.children}</span>
  </span>
)

const Profile = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.profile")
  const { searchParams, to } = useRouter()
  const [username, setUsername] = createSignal(me().username)
  const [password, setPassword] = createSignal("")
  const [confirmPassword, setConfirmPassword] = createSignal("")
  const usecompatibility = getSettingBool("sso_compatibility_mode")
  const [loading, save] = useFetch((ssoID?: boolean): PEmptyResp =>
    r.post("/me/update", {
      username: ssoID ? me().username : username(),
      password: ssoID ? "" : password(),
      sso_id: me().sso_id,
    }),
  )

  interface WebauthnCredential {
    fingerprint: string
    id: string
  }

  interface Webauthntemp {
    session: string
    options: { publicKey: PublicKeyCredentialCreationOptionsJSON }
  }

  const [getauthncredentialsloading, getauthncredentials] = useFetch(
    (): PResp<WebauthnCredential[]> => r.get("/authn/getcredentials"),
  )
  const [, getauthntemp] = useFetch((): PResp<Webauthntemp> =>
    r.get("/authn/webauthn_begin_registration"),
  )
  const [postregistrationloading, postregistration] = useFetch(
    (session: string, credentials: PublicKeyCredential): PEmptyResp =>
      r.post(
        "/authn/webauthn_finish_registration",
        JSON.stringify(credentials.toJSON()),
        {
          headers: {
            session: session,
          },
        },
      ),
  )

  const saveMe = async (ssoID?: boolean) => {
    if (password() && password() !== confirmPassword()) {
      notify.warning(t("users.confirm_password_not_same"))
      return
    }
    const resp = await save(ssoID)
    handleResp(resp, () => {
      setMe({ ...me(), username: username() })
      if (!ssoID) {
        notify.success(t("users.update_profile_success"))
        to(`/@login?redirect=${encodeURIComponent(location.pathname)}`)
      } else {
        to("")
      }
    })
  }

  const ssoID = searchParams["sso_id"]
  if (ssoID) {
    setMe({ ...me(), sso_id: ssoID })
    saveMe(true)
  }

  function messageEvent(event: MessageEvent) {
    const data = event.data
    if (data?.sso_id) {
      setMe({ ...me(), sso_id: data.sso_id })
      saveMe(true)
    }
  }
  window.addEventListener("message", messageEvent)
  onCleanup(() => {
    window.removeEventListener("message", messageEvent)
  })

  const [credentials, setcredentials] = createSignal<WebauthnCredential[]>([])
  const initauthnEdit = async () => {
    const resp = await getauthncredentials()
    handleRespWithoutNotify(resp, setcredentials)
  }
  if (
    supported() &&
    !UserMethods.is_guest(me()) &&
    getSettingBool("webauthn_login_enabled")
  ) {
    initauthnEdit()
  }

  const roleName = createMemo(() => ROLES[me().role] ?? "general")
  const grantedCount = createMemo(
    () => UserPermissions.filter((_, i) => UserMethods.can(me(), i)).length,
  )

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">
            {UserMethods.is_guest(me())
              ? t("manage.sidemenu.profile")
              : t("users.update_profile")}
          </h1>
          <div
            style={{
              display: "flex",
              "align-items": "center",
              "flex-wrap": "wrap",
              gap: "8px",
              "margin-top": "2px",
            }}
          >
            <span
              class="ol-pill"
              data-tone={roleName() === "admin" ? "accent" : undefined}
            >
              {t(`users.roles.${roleName()}`)}
            </span>
            <code
              style={{
                "font-family": "var(--ol-font-mono)",
                "font-size": "12.5px",
                color: "var(--ol-text-muted)",
              }}
            >
              {me().base_path || "/"}
            </code>
          </div>
        </div>
      </div>

      <Show
        when={!UserMethods.is_guest(me())}
        fallback={
          <section class="ol-admin-card">
            <div
              style={{
                display: "flex",
                "flex-direction": "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  "align-items": "flex-start",
                  gap: "10px",
                }}
              >
                <TbAlertTriangle
                  size={18}
                  class="ol-ico"
                  style={{
                    color: "var(--ol-warn)",
                    "flex-shrink": 0,
                    "margin-top": "2px",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    "flex-direction": "column",
                    gap: "3px",
                  }}
                >
                  <strong style={{ "font-weight": 600 }}>
                    {t("users.guest-tips")}
                  </strong>
                  <span
                    style={{
                      "font-size": "13px",
                      color: "var(--ol-text-secondary)",
                    }}
                  >
                    {t("users.modify_nothing")}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "8px",
                  "flex-wrap": "wrap",
                }}
              >
                <span
                  style={{
                    "font-size": "13px",
                    color: "var(--ol-text-muted)",
                  }}
                >
                  {t("global.have_account")}
                </span>
                <LinkWithBase
                  class="ol-btn ol-btn--primary"
                  href={`/@login?redirect=${encodeURIComponent(
                    location.pathname,
                  )}`}
                >
                  <TbLogin size={15} class="ol-ico" />
                  <span>{t("global.go_login")}</span>
                </LinkWithBase>
              </div>
            </div>
          </section>
        }
      >
        {/* Credentials & 2FA */}
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <h2 class="ol-admin-card__title">{t("users.update_profile")}</h2>
            <Show when={me().otp}>
              <span class="ol-status">
                <span class="ol-status-dot" data-status="work" />
                <span>2FA</span>
              </span>
            </Show>
          </div>

          <div class="ol-admin-form-stack">
            <div class="ol-admin-form-grid">
              <FormControl>
                <FormLabel for="username">
                  {t("users.change_username")}
                </FormLabel>
                <Input
                  id="username"
                  value={username()}
                  onInput={(e) => setUsername(e.currentTarget.value)}
                />
              </FormControl>
            </div>

            <div class="ol-admin-form-grid">
              <FormControl>
                <FormLabel for="password">
                  {t("users.change_password")}
                </FormLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                />
                <FormHelperText>
                  {t("users.change_password-tips")}
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel for="confirm-password">
                  {t("users.confirm_password")}
                </FormLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="********"
                  value={confirmPassword()}
                  onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                />
                <FormHelperText>
                  {t("users.confirm_password-tips")}
                </FormHelperText>
              </FormControl>
            </div>
          </div>

          <div class="ol-admin-card__foot">
            <div
              style={{
                display: "flex",
                "align-items": "center",
                gap: "8px",
                "flex-wrap": "wrap",
              }}
            >
              <Button
                colorScheme="accent"
                loading={loading()}
                onClick={[saveMe, false]}
              >
                <TbDeviceFloppy
                  size={15}
                  class="ol-ico"
                  style={{ "margin-right": "5px" }}
                />
                {t("global.save")}
              </Button>
              <Show when={!me().otp}>
                <Button onClick={() => to("/@manage/2fa")}>
                  <TbShieldLock
                    size={15}
                    class="ol-ico"
                    style={{ "margin-right": "5px" }}
                  />
                  {t("users.enable_2fa")}
                </Button>
              </Show>
            </div>
          </div>
        </section>
      </Show>

      {/* Single Sign-On */}
      <Show
        when={
          getSettingBool("sso_login_enabled") && !UserMethods.is_guest(me())
        }
      >
        <section class="ol-admin-card">
          <div class="ol-admin-card__head" style={{ "margin-bottom": 0 }}>
            <div>
              <h2 class="ol-admin-card__title">{t("users.sso_login")}</h2>
              <Show when={me().sso_id}>
                <p class="ol-admin-card__subtitle">{me().sso_id}</p>
              </Show>
            </div>
            <Show
              when={me().sso_id}
              fallback={
                <Button
                  onClick={() => {
                    const url = r.getUri() + "/auth/sso?method=get_sso_id"
                    if (usecompatibility) {
                      window.location.href = url
                      return
                    }
                    window.open(url, "authPopup", "width=500,height=600")
                  }}
                >
                  <TbLink
                    size={15}
                    class="ol-ico"
                    style={{ "margin-right": "5px" }}
                  />
                  {t("users.connect_sso")}
                </Button>
              }
            >
              <Button
                colorScheme="danger"
                loading={loading()}
                onClick={() => {
                  setMe({ ...me(), sso_id: "" })
                  saveMe(true)
                }}
              >
                <TbLinkOff
                  size={15}
                  class="ol-ico"
                  style={{ "margin-right": "5px" }}
                />
                {t("users.disconnect_sso")}
              </Button>
            </Show>
          </div>
        </section>
      </Show>

      {/* WebAuthn / Passkeys */}
      <Show
        when={
          !UserMethods.is_guest(me()) &&
          getSettingBool("webauthn_login_enabled")
        }
      >
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <h2
              class="ol-admin-card__title"
              style={{
                display: "inline-flex",
                "align-items": "center",
                gap: "8px",
              }}
            >
              <TbFingerprint size={17} class="ol-ico" />
              <span>{t("users.webauthn")}</span>
            </h2>
            <Button
              loading={postregistrationloading()}
              onClick={async () => {
                if (!supported()) {
                  notify.error(t("users.webauthn_not_supported"))
                  return
                }
                const resp = await getauthntemp()
                handleResp(resp, async (data) => {
                  const session = data.session
                  try {
                    const browserresponse = (await navigator.credentials.create(
                      {
                        publicKey:
                          PublicKeyCredential.parseCreationOptionsFromJSON(
                            data.options.publicKey,
                          ),
                      },
                    )) as PublicKeyCredential
                    handleResp(
                      await postregistration(session, browserresponse),
                      () => {
                        notify.success(t("users.add_webauthn_success"))
                        initauthnEdit()
                      },
                    )
                  } catch (error: unknown) {
                    if (error instanceof Error) notify.error(error.message)
                  }
                })
              }}
            >
              <TbPlus
                size={14}
                class="ol-ico"
                style={{ "margin-right": "4px" }}
              />
              {t("users.add_webauthn")}
            </Button>
          </div>

          <MaybeLoading loading={getauthncredentialsloading()}>
            <Show
              when={credentials().length > 0}
              fallback={
                <div class="ol-admin-empty" style={{ padding: "18px 12px" }}>
                  {t("manage.common.no_data")}
                </div>
              }
            >
              <div
                style={{
                  display: "flex",
                  "flex-direction": "column",
                  gap: "8px",
                }}
              >
                <For each={credentials()}>
                  {(item) => (
                    <WebauthnItem id={item.id} fingerprint={item.fingerprint} />
                  )}
                </For>
              </div>
            </Show>
          </MaybeLoading>
        </section>
      </Show>

      {/* SSH Public Keys */}
      <Show
        when={UserMethods.can(
          me(),
          UserPermissions.findIndex((p) => p === "ftp_read"),
        )}
      >
        <PublicKeys isMine={true} userId={me().id} />
      </Show>

      {/* Effective Permissions */}
      <section class="ol-admin-card">
        <div class="ol-admin-card__head">
          <h2 class="ol-admin-card__title">{t("users.permission")}</h2>
          <span class="ol-pill ol-tabular">
            {grantedCount()} / {UserPermissions.length}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            "flex-wrap": "wrap",
            gap: "8px",
          }}
        >
          <For each={UserPermissions}>
            {(item, i) => (
              <PermissionPill can={UserMethods.can(me(), i())}>
                {t(`users.permissions.${item}`)}
              </PermissionPill>
            )}
          </For>
        </div>
      </section>
    </div>
  )
}

export default Profile
