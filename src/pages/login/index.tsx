import { useColorMode } from "@hope-ui/solid"
import { createStorageSignal } from "@solid-primitives/storage"
import {
  TbArrowLeft,
  TbFingerprint,
  TbLanguage,
  TbMoon,
  TbSun,
} from "solid-icons/tb"
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js"
import { SwitchLanguage } from "~/components"
import { SiteLogo } from "~/components/icons-tb"
import { useFetch, useLoading, useRouter, useT, useTitle } from "~/hooks"
import { getSetting, getSettingBool } from "~/store"
import { PResp, Resp } from "~/types"
import {
  base_path,
  changeToken,
  handleResp,
  handleRespWithoutAuthAndNotify,
  hashPwd,
  notify,
  r,
} from "~/utils"
import { toggleThemeWithTransition } from "~/utils/theme_sync"
import "../manage/manage.css"
import { SSOLogin } from "./SSOLogin"

const supported = () =>
  !!globalThis.PublicKeyCredential?.parseRequestOptionsFromJSON

const Login = () => {
  const t = useT()
  const { colorMode, toggleColorMode } = useColorMode()
  const isDark = () => colorMode() === "dark"

  const siteTitle = () => getSetting("site_title") || "OpenList"

  const logoUrl = createMemo(() => {
    const raw = (getSetting("logo") || "").trim()
    if (!raw) return ""
    const lines = raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length === 0) return ""
    if (isDark() && lines.length > 1) return lines[lines.length - 1]
    return lines[0]
  })

  const wallpaperUrl = createMemo(() => {
    const raw = (getSetting("appearance_wallpaper") || "").trim()
    if (!raw) return ""
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length === 0) return ""
    if (isDark() && lines[1]) return lines[1]
    return lines[0]
  })

  const surfaceMode = createMemo<"glass" | "solid">(() => {
    const raw = (getSetting("appearance_surface_mode") || "solid").trim()
    return raw === "glass" ? "glass" : "solid"
  })

  const title = createMemo(() => {
    return `${t("login.login_to")} ${siteTitle()}`
  })
  useTitle(title)

  const [username, setUsername] = createSignal(
    localStorage.getItem("username") || "",
  )
  const [password, setPassword] = createSignal(
    localStorage.getItem("password") || "",
  )
  const [opt, setOpt] = createSignal("")
  const [useauthn, setuseauthn] = createSignal(false)
  const [remember, setRemember] = createStorageSignal("remember-pwd", "false")
  const [useLdap, setUseLdap] = createSignal(false)

  const [loading, data] = useLoading(
    async (): Promise<Resp<{ token: string }>> => {
      if (useLdap()) {
        return r.post("/auth/login/ldap", {
          username: username(),
          password: password(),
          otp_code: opt(),
        })
      }
      return r.post("/auth/login/hash", {
        username: username(),
        password: hashPwd(password()),
        otp_code: opt(),
      })
    },
  )

  const [, postauthnlogin] = useFetch(
    (
      session: string,
      credentials: PublicKeyCredential,
      user: string,
      signal: AbortSignal | undefined,
    ): Promise<Resp<{ token: string }>> =>
      r.post(
        "/authn/webauthn_finish_login?username=" + user,
        JSON.stringify(credentials.toJSON()),
        {
          headers: {
            session,
          },
          signal,
        },
      ),
  )

  interface WebAuthnTemp {
    session: string
    options: { publicKey: PublicKeyCredentialRequestOptionsJSON }
  }

  const [, getauthntemp] = useFetch(
    (user: string, signal: AbortSignal | undefined): PResp<WebAuthnTemp> =>
      r.get("/authn/webauthn_begin_login?username=" + user, {
        signal,
      }),
  )

  const { searchParams, to } = useRouter()

  const isAuthnConditionalAvailable = async (): Promise<boolean> => {
    if (
      globalThis.PublicKeyCredential &&
      "isConditionalMediationAvailable" in PublicKeyCredential
    ) {
      return await PublicKeyCredential.isConditionalMediationAvailable()
    }
    return false
  }

  const AuthnSignEnabled = getSettingBool("webauthn_login_enabled")
  const AuthnSwitch = () => {
    setuseauthn(!useauthn())
  }

  let AuthnSignal: AbortController | null = null

  const AuthnLogin = async (conditional?: boolean) => {
    if (!supported()) {
      if (!conditional) {
        notify.error(t("users.webauthn_not_supported"))
      }
      return
    }
    if (conditional && !(await isAuthnConditionalAvailable())) {
      return
    }
    AuthnSignal?.abort()
    const controller = new AbortController()
    AuthnSignal = controller
    const usernameLogin: string = conditional ? "" : username()
    if (!conditional && remember() === "true") {
      localStorage.setItem("username", username())
    } else if (!conditional) {
      localStorage.removeItem("username")
    }
    const resp = await getauthntemp(usernameLogin, controller.signal)
    handleResp(resp, async (respData) => {
      try {
        const requestOptions: CredentialRequestOptions = {
          publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(
            respData.options.publicKey,
          ),
          signal: controller.signal,
        }
        if (conditional) {
          requestOptions.mediation = "conditional"
        }
        const credentials = (await navigator.credentials.get(
          requestOptions,
        )) as PublicKeyCredential
        const finishResp = await postauthnlogin(
          respData.session,
          credentials,
          usernameLogin,
          controller.signal,
        )
        handleRespWithoutAuthAndNotify(
          finishResp,
          (loginData) => {
            notify.success(t("login.success"))
            changeToken(loginData.token)
            to(
              decodeURIComponent(searchParams.redirect || base_path || "/"),
              true,
            )
          },
          (msg) => {
            notify.error(msg)
          },
        )
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          notify.error(error.message)
        }
      }
    })
  }

  const AuthnCleanUpHandler = () => AuthnSignal?.abort()

  onMount(() => {
    document.body.dataset.olAdminPortal = "true"
    if (AuthnSignEnabled) {
      window.addEventListener("beforeunload", AuthnCleanUpHandler)
      AuthnLogin(true)
    }
  })

  onCleanup(() => {
    delete document.body.dataset.olAdminPortal
    AuthnSignal?.abort()
    window.removeEventListener("beforeunload", AuthnCleanUpHandler)
  })

  const [needOpt, setNeedOpt] = createSignal(false)
  const ldapLoginEnabled = getSettingBool("ldap_login_enabled")
  const ldapLoginTips = getSetting("ldap_login_tips")
  if (ldapLoginEnabled) {
    setUseLdap(true)
  }

  const submitLogin = async () => {
    if (!useauthn()) {
      if (remember() === "true") {
        localStorage.setItem("username", username())
        localStorage.setItem("password", password())
      } else {
        localStorage.removeItem("username")
        localStorage.removeItem("password")
      }
      const resp = await data()
      handleRespWithoutAuthAndNotify(
        resp,
        (resData) => {
          notify.success(t("login.success"))
          changeToken(resData.token)
          to(
            decodeURIComponent(searchParams.redirect || base_path || "/"),
            true,
          )
        },
        (msg, code) => {
          if (!needOpt() && code === 402) {
            setNeedOpt(true)
          } else {
            notify.error(msg)
          }
        },
      )
    } else {
      await AuthnLogin()
    }
  }

  return (
    <div
      class="ol-modern-scope ol-login"
      data-modern-theme={isDark() ? "dark" : "light"}
      data-wallpaper={wallpaperUrl() ? "on" : "off"}
      data-surface={surfaceMode()}
    >
      <Show when={wallpaperUrl()}>
        <div
          class="ol-home__wallpaper"
          style={{ "background-image": `url("${wallpaperUrl()}")` }}
        />
      </Show>

      <div class="ol-sheet ol-login__card">
        <div class="ol-login__header">
          <SiteLogo src={logoUrl()} title={siteTitle()} size={42} />
          <h1 class="ol-login__title">{title()}</h1>
        </div>

        <form
          class="ol-login__form"
          onSubmit={(e) => {
            e.preventDefault()
            submitLogin()
          }}
        >
          <Show
            when={!needOpt()}
            fallback={
              <>
                <div class="ol-login__row">
                  <button
                    type="button"
                    class="ol-btn ol-btn--ghost"
                    onClick={() => {
                      setNeedOpt(false)
                      setOpt("")
                    }}
                  >
                    <TbArrowLeft size={15} class="ol-ico" />
                    <span>{t("login.login")}</span>
                  </button>
                </div>
                <input
                  id="totp"
                  name="otp"
                  class="ol-ui-input"
                  autocomplete="one-time-code"
                  placeholder={t("login.otp-tips")}
                  value={opt()}
                  onInput={(e) => setOpt(e.currentTarget.value)}
                />
              </>
            }
          >
            <input
              name="username"
              class="ol-ui-input"
              autocomplete="username webauthn"
              placeholder={t("login.username-tips")}
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
            />

            <Show when={!useauthn()}>
              <input
                name="password"
                type="password"
                class="ol-ui-input"
                autocomplete="current-password"
                placeholder={t("login.password-tips")}
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
            </Show>

            <div class="ol-login__row">
              <label class="ol-login__check">
                <input
                  type="checkbox"
                  class="ol-checkbox"
                  checked={remember() === "true"}
                  onChange={() =>
                    setRemember(remember() === "true" ? "false" : "true")
                  }
                />
                <span>{t("login.remember")}</span>
              </label>
              <a
                class="ol-link-btn"
                target="_blank"
                rel="noopener noreferrer"
                href={t("login.forget_url")}
              >
                {t("login.forget")}
              </a>
            </div>
          </Show>

          <Show when={ldapLoginEnabled && !needOpt() && !useauthn()}>
            <label class="ol-login__check">
              <input
                type="checkbox"
                class="ol-checkbox"
                checked={useLdap() === true}
                onChange={() => setUseLdap(!useLdap())}
              />
              <span>{ldapLoginTips}</span>
            </label>
          </Show>

          <div class="ol-login__actions">
            <Show when={!useauthn()}>
              <button
                type="button"
                class="ol-btn"
                onClick={() => {
                  if (needOpt()) {
                    setOpt("")
                  } else {
                    setUsername("")
                    setPassword("")
                  }
                }}
              >
                {t("login.clear")}
              </button>
            </Show>
            <button
              type="submit"
              class="ol-btn ol-btn--primary"
              disabled={loading()}
            >
              <Show when={loading()}>
                <span class="ol-ui-spinner" />
              </Show>
              <Show when={useauthn()}>
                <TbFingerprint size={16} class="ol-ico" />
              </Show>
              <span>{t("login.login")}</span>
            </button>
          </div>

          <button
            type="button"
            class="ol-btn ol-login__guest"
            onClick={() => {
              changeToken()
              to(
                decodeURIComponent(searchParams.redirect || base_path || "/"),
                true,
              )
            }}
          >
            <TbArrowLeft size={15} class="ol-ico" />
            <span>{t("login.use_guest")}</span>
          </button>
        </form>

        <div class="ol-login__footer">
          <SwitchLanguage
            as="button"
            type="button"
            class="ol-icon-btn"
            aria-label="Language"
            title="Language"
          >
            <TbLanguage size={18} class="ol-ico" />
          </SwitchLanguage>

          <button
            type="button"
            class="ol-icon-btn"
            title={t("home.toolbar.toggle_theme")}
            aria-label={t("home.toolbar.toggle_theme")}
            onClick={() => toggleThemeWithTransition(toggleColorMode)}
          >
            {isDark() ? (
              <TbSun size={18} class="ol-ico" />
            ) : (
              <TbMoon size={18} class="ol-ico" />
            )}
          </button>

          <SSOLogin />

          <Show when={AuthnSignEnabled}>
            <button
              type="button"
              class="ol-icon-btn"
              data-active={useauthn() ? "true" : "false"}
              aria-pressed={useauthn() ? "true" : "false"}
              title={t("users.webauthn")}
              aria-label={t("users.webauthn")}
              onClick={AuthnSwitch}
            >
              <TbFingerprint size={18} class="ol-ico" />
            </button>
          </Show>
        </div>
      </div>
    </div>
  )
}

export default Login
