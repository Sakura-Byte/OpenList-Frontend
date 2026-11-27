import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Switch as HopeSwitch,
  Textarea,
} from "@hope-ui/solid"
import { TbArrowLeft, TbDeviceFloppy } from "solid-icons/tb"
import { Show } from "solid-js"
import { createStore } from "solid-js/store"
import { FolderChooseInput, MaybeLoading, SelectWrapper } from "~/components"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { clampCloseDelay, loadPublicPromotions } from "~/store"
import {
  PEmptyResp,
  PResp,
  Promotion,
  PromotionFreqCap,
  PromotionSlot,
} from "~/types"
import { handleResp, notify, r } from "~/utils"

const AddOrEditPromotion = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.promotions")
  const { params, to } = useRouter()
  const { id } = params

  const [promo, setPromo] = createStore<Promotion>({
    id: 0,
    slot: "header_banner",
    title: "",
    subtitle: "",
    body: "",
    image: "",
    cta_url: "",
    cta_text: "",
    track_name: "",
    track_piece: "",
    close_delay_sec: 0,
    allow_snooze: true,
    freq_cap: "session",
    path_prefix: "/",
    priority: 0,
    enabled: true,
  })

  const [loading, loadItem] = useFetch((): PResp<Promotion> =>
    r.get(`/admin/promotion/get?id=${id}`),
  )

  if (id) {
    loadItem().then((resp) => {
      handleResp<Promotion>(resp, (data) => setPromo(data))
    })
  }

  const [saving, saveItem] = useFetch((): PEmptyResp =>
    r.post(`/admin/promotion/${id ? "update" : "create"}`, {
      ...promo,
      close_delay_sec: clampCloseDelay(promo.close_delay_sec),
    }),
  )

  const slots: PromotionSlot[] = [
    "popup_ad",
    "header_banner",
    "readme_sponsor",
    "ad_recruit",
    "subdir_sponsor",
  ]

  const freqCaps: PromotionFreqCap[] = ["visit", "session", "12h", "24h"]

  return (
    <MaybeLoading loading={loading()}>
      <div class="ol-admin-page">
        <div class="ol-admin-head">
          <div class="ol-admin-head__main">
            <h1 class="ol-admin-title">{t(`global.${id ? "edit" : "add"}`)}</h1>
            <p class="ol-admin-subtitle">{t("manage.sidemenu.promotions")}</p>
          </div>
          <div class="ol-admin-head__actions">
            <button
              type="button"
              class="ol-btn"
              onClick={() => to("/@manage/promotions")}
            >
              <TbArrowLeft size={15} class="ol-ico" />
              <span>{t("global.back")}</span>
            </button>
          </div>
        </div>

        {/* Section 1: Basic Slot & Copy */}
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <h2 class="ol-admin-card__title">
              {t("promotions.slot")} · {t("promotions.title")}
            </h2>
            <FormControl display="inline-flex" alignItems="center" gap="$2">
              <FormLabel for="promo-enabled" mb="0">
                {t("promotions.enabled")}
              </FormLabel>
              <HopeSwitch
                id="promo-enabled"
                checked={promo.enabled}
                onChange={(e: any) =>
                  setPromo("enabled", e.currentTarget.checked)
                }
              />
            </FormControl>
          </div>

          <div class="ol-admin-form-stack">
            <div class="ol-admin-form-grid">
              <FormControl required>
                <FormLabel>{t("promotions.slot")}</FormLabel>
                <SelectWrapper
                  value={promo.slot}
                  onChange={(v) => setPromo("slot", v as PromotionSlot)}
                  options={slots.map((s) => ({
                    value: s,
                    label: t(`promotions.slots.${s}`),
                  }))}
                />
              </FormControl>

              <FormControl required>
                <FormLabel for="promo-title">{t("promotions.title")}</FormLabel>
                <Input
                  id="promo-title"
                  value={promo.title}
                  onInput={(e) => setPromo("title", e.currentTarget.value)}
                />
              </FormControl>
            </div>

            <FormControl w="$full">
              <FormLabel for="promo-subtitle">
                {t("promotions.subtitle")}
              </FormLabel>
              <Input
                id="promo-subtitle"
                value={promo.subtitle}
                onInput={(e) => setPromo("subtitle", e.currentTarget.value)}
              />
            </FormControl>

            <FormControl w="$full">
              <FormLabel for="promo-body">{t("promotions.body")}</FormLabel>
              <Textarea
                id="promo-body"
                rows={3}
                value={promo.body}
                onInput={(e) => setPromo("body", e.currentTarget.value)}
              />
            </FormControl>

            <div class="ol-admin-form-grid">
              <FormControl>
                <FormLabel>{t("promotions.path_prefix")}</FormLabel>
                <FolderChooseInput
                  value={promo.path_prefix}
                  onChange={(p) => setPromo("path_prefix", p || "/")}
                />
              </FormControl>

              <FormControl>
                <FormLabel for="promo-priority">
                  {t("promotions.priority")}
                </FormLabel>
                <Input
                  id="promo-priority"
                  type="number"
                  class="ol-tabular"
                  value={promo.priority}
                  onInput={(e) =>
                    setPromo("priority", Number(e.currentTarget.value) || 0)
                  }
                />
              </FormControl>
            </div>
          </div>
        </section>

        {/* Section 2: Media & Tracking + Live Aspect-Safe Preview */}
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <h2 class="ol-admin-card__title">
              {t("promotions.image")} · {t("promotions.cta_url")}
            </h2>
          </div>

          <div class="ol-admin-form-stack">
            <div class="ol-admin-form-grid">
              <FormControl>
                <FormLabel for="promo-image">{t("promotions.image")}</FormLabel>
                <Input
                  id="promo-image"
                  value={promo.image}
                  onInput={(e) => setPromo("image", e.currentTarget.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel for="promo-cta-url">
                  {t("promotions.cta_url")}
                </FormLabel>
                <Input
                  id="promo-cta-url"
                  value={promo.cta_url}
                  onInput={(e) => setPromo("cta_url", e.currentTarget.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel for="promo-cta-text">
                  {t("promotions.cta_text")}
                </FormLabel>
                <Input
                  id="promo-cta-text"
                  value={promo.cta_text}
                  onInput={(e) => setPromo("cta_text", e.currentTarget.value)}
                />
              </FormControl>
            </div>

            <Show when={promo.image?.trim()}>
              <div
                style={{
                  display: "flex",
                  "flex-direction": "column",
                  "align-items": "center",
                  "justify-content": "center",
                  gap: "10px",
                  padding: "14px",
                  background: "var(--ol-surface-2)",
                  border: "1px solid var(--ol-border)",
                  "border-radius": "var(--ol-radius-md)",
                }}
              >
                <img
                  src={promo.image}
                  alt={promo.title || ""}
                  style={{
                    "max-width": "100%",
                    "max-height": "220px",
                    width: "auto",
                    height: "auto",
                    "object-fit": "contain",
                    display: "block",
                    "border-radius": "var(--ol-radius-xs)",
                  }}
                />
                <Show when={promo.title || promo.cta_text}>
                  <div
                    style={{
                      display: "flex",
                      "align-items": "center",
                      gap: "10px",
                      "flex-wrap": "wrap",
                      "font-size": "12.5px",
                      color: "var(--ol-text-secondary)",
                    }}
                  >
                    <Show when={promo.title}>
                      <span style={{ "font-weight": 550 }}>{promo.title}</span>
                    </Show>
                    <Show when={promo.cta_text}>
                      <span class="ol-pill" data-tone="accent">
                        {promo.cta_text}
                      </span>
                    </Show>
                  </div>
                </Show>
              </div>
            </Show>

            <div class="ol-admin-form-grid">
              <FormControl>
                <FormLabel for="promo-track-name">
                  {t("promotions.track_name")}
                </FormLabel>
                <Input
                  id="promo-track-name"
                  value={promo.track_name}
                  onInput={(e) => setPromo("track_name", e.currentTarget.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel for="promo-track-piece">
                  {t("promotions.track_piece")}
                </FormLabel>
                <Input
                  id="promo-track-piece"
                  value={promo.track_piece}
                  onInput={(e) =>
                    setPromo("track_piece", e.currentTarget.value)
                  }
                />
              </FormControl>
            </div>
          </div>
        </section>

        {/* Section 3: Popup Policy */}
        <section class="ol-admin-card">
          <div class="ol-admin-card__head">
            <h2 class="ol-admin-card__title">
              {t("promotions.slots.popup_ad")} · {t("promotions.freq_cap")}
            </h2>
            <span
              class="ol-pill"
              data-tone={promo.slot === "popup_ad" ? "accent" : undefined}
            >
              {t(`promotions.slots.${promo.slot}`)}
            </span>
          </div>

          <div class="ol-admin-form-grid">
            <FormControl>
              <FormLabel>{t("promotions.freq_cap")}</FormLabel>
              <SelectWrapper
                value={promo.freq_cap}
                onChange={(v) => setPromo("freq_cap", v as PromotionFreqCap)}
                options={freqCaps.map((c) => ({
                  value: c,
                  label: t(`promotions.freq_caps.${c}`),
                }))}
              />
            </FormControl>

            <FormControl>
              <FormLabel for="promo-delay">
                {t("promotions.close_delay_sec")}
              </FormLabel>
              <Input
                id="promo-delay"
                type="number"
                class="ol-tabular"
                min={0}
                max={10}
                value={promo.close_delay_sec}
                onInput={(e) =>
                  setPromo(
                    "close_delay_sec",
                    clampCloseDelay(Number(e.currentTarget.value)),
                  )
                }
              />
              <FormHelperText>
                {t("promotions.close_delay_help")}
              </FormHelperText>
            </FormControl>

            <FormControl
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              pt="$4"
            >
              <FormLabel for="promo-snooze" mb="0">
                {t("promotions.allow_snooze")}
              </FormLabel>
              <HopeSwitch
                id="promo-snooze"
                checked={promo.allow_snooze}
                onChange={(e: any) =>
                  setPromo("allow_snooze", e.currentTarget.checked)
                }
              />
            </FormControl>
          </div>
        </section>

        <div class="ol-sticky-actions">
          <button
            type="button"
            class="ol-btn"
            onClick={() => to("/@manage/promotions")}
          >
            <span>{t("global.cancel")}</span>
          </button>
          <Button
            colorScheme="accent"
            loading={saving()}
            onClick={async () => {
              const resp = await saveItem()
              handleResp(resp, () => {
                notify.success(t("global.save_success"))
                loadPublicPromotions()
                to("/@manage/promotions", false, { replace: true })
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

export default AddOrEditPromotion
