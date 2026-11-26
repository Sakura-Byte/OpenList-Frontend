import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Input,
  Switch as HopeSwitch,
  Textarea,
  VStack,
} from "@hope-ui/solid"
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
      <VStack w="$full" alignItems="start" spacing="$3">
        <Heading>{t(`global.${id ? "edit" : "add"}`)}</Heading>

        <HStack w="$full" spacing="$3" flexWrap="wrap">
          <FormControl flex="1" minW="220px" required>
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

          <FormControl flex="2" minW="240px" required>
            <FormLabel for="promo-title">{t("promotions.title")}</FormLabel>
            <Input
              id="promo-title"
              value={promo.title}
              onInput={(e) => setPromo("title", e.currentTarget.value)}
            />
          </FormControl>
        </HStack>

        <FormControl w="$full">
          <FormLabel for="promo-subtitle">{t("promotions.subtitle")}</FormLabel>
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

        <HStack w="$full" spacing="$3" flexWrap="wrap">
          <FormControl flex="1" minW="240px">
            <FormLabel for="promo-image">{t("promotions.image")}</FormLabel>
            <Input
              id="promo-image"
              value={promo.image}
              onInput={(e) => setPromo("image", e.currentTarget.value)}
            />
          </FormControl>

          <FormControl flex="1" minW="240px">
            <FormLabel for="promo-cta-url">{t("promotions.cta_url")}</FormLabel>
            <Input
              id="promo-cta-url"
              value={promo.cta_url}
              onInput={(e) => setPromo("cta_url", e.currentTarget.value)}
            />
          </FormControl>

          <FormControl flex="1" minW="180px">
            <FormLabel for="promo-cta-text">
              {t("promotions.cta_text")}
            </FormLabel>
            <Input
              id="promo-cta-text"
              value={promo.cta_text}
              onInput={(e) => setPromo("cta_text", e.currentTarget.value)}
            />
          </FormControl>
        </HStack>

        <HStack w="$full" spacing="$3" flexWrap="wrap">
          <FormControl flex="1" minW="220px">
            <FormLabel for="promo-track-name">
              {t("promotions.track_name")}
            </FormLabel>
            <Input
              id="promo-track-name"
              value={promo.track_name}
              onInput={(e) => setPromo("track_name", e.currentTarget.value)}
            />
          </FormControl>

          <FormControl flex="1" minW="220px">
            <FormLabel for="promo-track-piece">
              {t("promotions.track_piece")}
            </FormLabel>
            <Input
              id="promo-track-piece"
              value={promo.track_piece}
              onInput={(e) => setPromo("track_piece", e.currentTarget.value)}
            />
          </FormControl>
        </HStack>

        <Show when={promo.slot === "popup_ad"}>
          <HStack w="$full" spacing="$3" flexWrap="wrap">
            <FormControl flex="1" minW="200px">
              <FormLabel for="promo-delay">
                {t("promotions.close_delay_sec")}
              </FormLabel>
              <Input
                id="promo-delay"
                type="number"
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

            <FormControl flex="1" minW="200px">
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

            <FormControl display="flex" alignItems="center" gap="$2" pt="$5">
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
          </HStack>
        </Show>

        <HStack w="$full" spacing="$3" flexWrap="wrap">
          <FormControl flex="2" minW="240px">
            <FormLabel>{t("promotions.path_prefix")}</FormLabel>
            <FolderChooseInput
              value={promo.path_prefix}
              onChange={(p) => setPromo("path_prefix", p || "/")}
            />
          </FormControl>

          <FormControl flex="1" minW="140px">
            <FormLabel for="promo-priority">
              {t("promotions.priority")}
            </FormLabel>
            <Input
              id="promo-priority"
              type="number"
              value={promo.priority}
              onInput={(e) =>
                setPromo("priority", Number(e.currentTarget.value) || 0)
              }
            />
          </FormControl>
        </HStack>

        <FormControl display="flex" alignItems="center" gap="$2">
          <FormLabel for="promo-enabled" mb="0">
            {t("promotions.enabled")}
          </FormLabel>
          <HopeSwitch
            id="promo-enabled"
            checked={promo.enabled}
            onChange={(e: any) => setPromo("enabled", e.currentTarget.checked)}
          />
        </FormControl>

        <HStack spacing="$2">
          <Button onClick={() => to("/@manage/promotions")}>
            {t("global.cancel")}
          </Button>
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
            {t(`global.${id ? "save" : "add"}`)}
          </Button>
        </HStack>
      </VStack>
    </MaybeLoading>
  )
}

export default AddOrEditPromotion
