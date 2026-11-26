import {
  Component,
  For,
  JSX,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
} from "solid-js"
import { ModernDialog } from "~/components/NoticeModal"
import { IClose } from "~/components/icons-tb"
import { useT } from "~/hooks"
import {
  MAX_PROMO_CLOSE_DELAY_SEC,
  activePopupAds,
  clampCloseDelay,
  closePopupAdModal,
  popupAdOpen,
  snoozePromosUntilLocalMidnight,
} from "~/store"

export const PromoPopupModal: Component = () => {
  const t = useT()
  const [remaining, setRemaining] = createSignal(0)

  const ads = () => activePopupAds()

  const delaySec = createMemo(() => {
    const list = ads()
    if (list.length === 0) return 0
    const maxRaw = Math.max(
      ...list.map((a) => clampCloseDelay(a.close_delay_sec)),
    )
    return Math.min(Math.max(maxRaw, 0), MAX_PROMO_CLOSE_DELAY_SEC)
  })

  const allowSnooze = createMemo(() =>
    ads().some((a) => Boolean(a.allow_snooze)),
  )

  createEffect(
    on(popupAdOpen, (isOpen) => {
      if (!isOpen) {
        setRemaining(0)
        return
      }
      const d = delaySec()
      setRemaining(d)
      if (d <= 0) return
      const timer = window.setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            window.clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      onCleanup(() => window.clearInterval(timer))
    }),
  )

  const locked = () => remaining() > 0

  const handleClose = () => {
    if (locked()) return
    closePopupAdModal()
  }

  const handleSnooze = () => {
    if (locked()) return
    snoozePromosUntilLocalMidnight(ads())
    closePopupAdModal()
  }

  return (
    <ModernDialog
      open={popupAdOpen() && ads().length > 0}
      onClose={handleClose}
      class="ol-dialog--ad"
      dismissible={!locked()}
    >
      <div class="ol-dialog__head">
        <span class="ol-ad-label" style={{ "margin-right": "auto" }}>
          {t("home.ad_label")}
        </span>
        <Show
          when={!locked()}
          fallback={
            <span class="ol-countdown" aria-live="polite">
              {t("home.promo.close_in", { seconds: String(remaining()) })}
              <span
                class="ol-countdown__ring"
                style={{ "--ol-d": `${delaySec()}s` } as JSX.CSSProperties}
              />
            </span>
          }
        >
          <button
            type="button"
            class="ol-icon-btn"
            title={t("home.promo.close")}
            aria-label={t("home.promo.close")}
            onClick={handleClose}
          >
            <IClose size={16} />
          </button>
        </Show>
      </div>

      <div class="ol-dialog__body" data-nosnippet>
        <For each={ads()}>
          {(ad) => (
            <a
              class="ol-ad-creative"
              href={ad.cta_url || "#"}
              target="_blank"
              rel="noopener sponsored"
              referrerpolicy="strict-origin-when-cross-origin"
              data-track-content=""
              data-content-name={ad.track_name || "popup_ad"}
              data-content-piece={
                ad.track_piece || ad.title || `promo-${ad.id}`
              }
            >
              <Show when={ad.image}>
                <img src={ad.image} alt="" loading="lazy" />
              </Show>
              <h3>{ad.title}</h3>
              <Show when={ad.subtitle || ad.body}>
                <p>{ad.subtitle || ad.body}</p>
              </Show>
              <Show when={ad.cta_text || ad.cta_url}>
                <span class="ol-btn ol-btn--block">
                  {ad.cta_text || t("home.subdir_sponsor.default_cta")}
                </span>
              </Show>
            </a>
          )}
        </For>
      </div>

      <div class="ol-dialog__foot">
        <Show when={allowSnooze()}>
          <button
            type="button"
            class="ol-btn ol-btn--ghost"
            style={{ "margin-right": "auto" }}
            disabled={locked()}
            onClick={handleSnooze}
          >
            {t("home.promo.snooze_today")}
          </button>
        </Show>
        <button
          type="button"
          class="ol-btn"
          disabled={locked()}
          onClick={handleClose}
        >
          {locked()
            ? t("home.promo.close_locked", { seconds: String(remaining()) })
            : t("home.promo.close")}
        </button>
      </div>
    </ModernDialog>
  )
}
