import { Button, FormControl, FormLabel, Input } from "@hope-ui/solid"
import { TbArrowLeft, TbQrcode, TbShieldCheck } from "solid-icons/tb"
import { createSignal, Show } from "solid-js"
import { MaybeLoading } from "~/components"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { me, setMe } from "~/store"
import { PEmptyResp, PResp } from "~/types"
import { handleResp, handleRespWithNotifySuccess, notify, r } from "~/utils"

interface Generate2FA {
  qr: string
  secret: string
}

const TwoFA = () => {
  const { back } = useRouter()
  const t = useT()
  useManageTitle("manage.sidemenu.profile")

  const [generateLoading, generate] = useFetch((): PResp<Generate2FA> =>
    r.post("/auth/2fa/generate"),
  )
  const [otpData, setOtpData] = createSignal<Generate2FA>()
  const init = async () => {
    if (me().otp) {
      notify.warning(t("users.2fa_already_enabled"))
      back()
      return
    }
    const resp = await generate()
    handleResp(resp, setOtpData)
  }
  const [code, setCode] = createSignal("")
  init()

  const [verifyLoading, verify] = useFetch((): PEmptyResp =>
    r.post("/auth/2fa/verify", {
      code: code(),
      secret: otpData()?.secret,
    }),
  )

  const verify2FA = async () => {
    const resp = await verify()
    handleRespWithNotifySuccess(resp, () => {
      setMe({ ...me(), otp: true })
      back()
    })
  }

  return (
    <MaybeLoading loading={generateLoading()}>
      <div class="ol-admin-page">
        <div class="ol-admin-head">
          <div class="ol-admin-head__main">
            <h1 class="ol-admin-title">{t("users.enable_2fa")}</h1>
          </div>
          <div class="ol-admin-head__actions">
            <button type="button" class="ol-btn" onClick={back}>
              <TbArrowLeft size={15} class="ol-ico" />
              <span>{t("global.back")}</span>
            </button>
          </div>
        </div>

        <Show when={otpData()}>
          <section class="ol-admin-card" style={{ "max-width": "540px" }}>
            <div class="ol-admin-card__head">
              <h2
                class="ol-admin-card__title"
                style={{
                  display: "inline-flex",
                  "align-items": "center",
                  gap: "8px",
                }}
              >
                <TbQrcode size={17} class="ol-ico" />
                <span>{t("users.scan_qr")}</span>
              </h2>
            </div>

            <div class="ol-admin-form-stack">
              <div
                style={{
                  padding: "12px",
                  background: "#ffffff",
                  border: "1px solid var(--ol-border)",
                  "border-radius": "var(--ol-radius-md)",
                  width: "fit-content",
                }}
              >
                <img
                  src={otpData()?.qr}
                  alt="2FA QR"
                  style={{
                    width: "184px",
                    height: "184px",
                    "object-fit": "contain",
                    display: "block",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  "flex-direction": "column",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    "font-size": "13px",
                    color: "var(--ol-text-secondary)",
                  }}
                >
                  {t("users.or_manual")}
                </span>
                <code
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    "border-radius": "var(--ol-radius-sm)",
                    border: "1px solid var(--ol-border)",
                    background: "var(--ol-surface-2)",
                    "font-family": "var(--ol-font-mono)",
                    "font-size": "13.5px",
                    "font-weight": 600,
                    color: "var(--ol-accent-text)",
                    "word-break": "break-all",
                    "user-select": "all",
                  }}
                >
                  {otpData()?.secret}
                </code>
              </div>

              <FormControl>
                <FormLabel for="otp-code">{t("users.input_code")}</FormLabel>
                <Input
                  id="otp-code"
                  class="ol-tabular"
                  placeholder={t("users.input_code")}
                  value={code()}
                  onInput={(e) => setCode(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      verify2FA()
                    }
                  }}
                />
              </FormControl>

              <div>
                <Button
                  colorScheme="accent"
                  loading={verifyLoading()}
                  onClick={verify2FA}
                >
                  <TbShieldCheck
                    size={15}
                    class="ol-ico"
                    style={{ "margin-right": "5px" }}
                  />
                  {t("users.verify")}
                </Button>
              </div>
            </div>
          </section>
        </Show>
      </div>
    </MaybeLoading>
  )
}

export default TwoFA
