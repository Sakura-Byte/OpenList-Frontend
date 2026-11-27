import {
  TbBrandGithub,
  TbBrandGoogle,
  TbBrandWindows,
  TbLogin,
  TbMessageCircle,
} from "solid-icons/tb"
import { onCleanup, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { useRouter, useT } from "~/hooks"
import { getSetting, getSettingBool } from "~/store"
import { base_path, changeToken, r } from "~/utils"

const SSOLogin = () => {
  const t = useT()
  const ssoSignEnabled = getSettingBool("sso_login_enabled")
  const loginPlatform = getSetting("sso_login_platform")
  const useCompatibility = getSettingBool("sso_compatibility_mode")
  const { searchParams, to } = useRouter()

  const token = searchParams["token"]
  if (token !== undefined && token !== "") {
    changeToken(token)
    to(decodeURIComponent(searchParams.redirect || base_path || "/"), true)
  }

  function messageEvent(event: MessageEvent) {
    const data = event.data
    if (data && typeof data === "object" && data.token) {
      changeToken(data.token)
      to(decodeURIComponent(searchParams.redirect || base_path || "/"), true)
    }
  }

  window.addEventListener("message", messageEvent)
  onCleanup(() => {
    window.removeEventListener("message", messageEvent)
  })

  const login = () => {
    const url = r.getUri() + "/auth/sso?method=sso_get_token"
    if (useCompatibility) {
      window.location.href = url
      return
    }
    window.open(url, "authPopup", "width=500,height=600")
  }

  const resolveIcon = () => {
    switch (loginPlatform) {
      case "Github":
        return TbBrandGithub
      case "Microsoft":
        return TbBrandWindows
      case "Google":
        return TbBrandGoogle
      case "Dingtalk":
        return TbMessageCircle
      default:
        return TbLogin
    }
  }

  return (
    <Show when={ssoSignEnabled}>
      <button
        type="button"
        class="ol-icon-btn"
        onClick={login}
        title={t("users.sso_login")}
        aria-label={t("users.sso_login")}
      >
        <Dynamic component={resolveIcon()} size={18} class="ol-ico" />
      </button>
    </Show>
  )
}

export { SSOLogin }
