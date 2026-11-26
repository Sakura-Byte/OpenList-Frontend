import { useColorMode } from "@hope-ui/solid"
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
import { Portal } from "solid-js/web"
import { Markdown } from "~/components/Markdown"
import { IAlert, IClose, IInfo, IMegaphone } from "~/components/icons-tb"
import { useT } from "~/hooks"
import {
  ackNoticeModal,
  autoModalNotice,
  closeNoticeModal,
  historyNotices,
  manualModalNotice,
} from "~/store"
import { Notice } from "~/types"
import { formatDate } from "~/utils"

export const ModernDialog: Component<{
  open: boolean
  onClose: () => void
  class?: string
  labelledBy?: string
  dismissible?: boolean
  children: JSX.Element
}> = (props) => {
  const { colorMode } = useColorMode()
  let panelRef: HTMLDivElement | undefined
  const canDismiss = () => props.dismissible ?? true

  const [mounted, setMounted] = createSignal(false)
  const [closing, setClosing] = createSignal(false)

  createEffect(
    on(
      () => props.open,
      (isOpen) => {
        if (isOpen) {
          setClosing(false)
          setMounted(true)
          return
        }
        if (!mounted()) return
        setClosing(true)
        const timer = window.setTimeout(() => {
          setMounted(false)
          setClosing(false)
        }, 200)
        onCleanup(() => window.clearTimeout(timer))
      },
    ),
  )

  createEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        if (canDismiss()) {
          props.onClose()
        } else {
          e.preventDefault()
        }
      }
    }
    window.addEventListener("keydown", onKey, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    queueMicrotask(() => panelRef?.focus())
    onCleanup(() => {
      window.removeEventListener("keydown", onKey, true)
      document.body.style.overflow = prevOverflow
    })
  })

  return (
    <Show when={mounted()}>
      <Portal>
        <div
          data-state={closing() ? "closing" : "open"}
          class="ol-modern-scope ol-overlay"
          data-modern-theme={colorMode() === "dark" ? "dark" : "light"}
          onClick={(e) =>
            e.target === e.currentTarget && canDismiss() && props.onClose()
          }
        >
          <div
            ref={panelRef}
            class={`ol-dialog ${props.class ?? ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={props.labelledBy}
            tabIndex={-1}
            style={{ outline: "none" }}
          >
            {props.children}
          </div>
        </div>
      </Portal>
    </Show>
  )
}

export const NoticeModal: Component = () => {
  const t = useT()
  const [showHistory, setShowHistory] = createSignal(false)
  const [selectedHistory, setSelectedHistory] = createSignal<Notice | null>(
    null,
  )

  const currentNotice = createMemo(
    () => manualModalNotice() ?? autoModalNotice(),
  )
  const isOpen = createMemo(() => Boolean(currentNotice()))

  createEffect(
    on(isOpen, (open) => {
      if (open) {
        setShowHistory(false)
        setSelectedHistory(null)
      }
    }),
  )

  const handleClose = () => {
    const cur = currentNotice()
    if (cur) {
      ackNoticeModal(cur)
    }
    closeNoticeModal()
  }

  const severityLabel = (sev: Notice["severity"]) => {
    if (sev === "critical") return t("home.notice.severity_critical")
    if (sev === "warning") return t("home.notice.severity_warning")
    return t("home.notice.severity_info")
  }

  const SeverityIcon: Component<{ severity: Notice["severity"] }> = (p) => (
    <>
      {p.severity === "critical" ? (
        <IMegaphone size={14} />
      ) : p.severity === "warning" ? (
        <IAlert size={14} />
      ) : (
        <IInfo size={14} />
      )}
    </>
  )

  const displayNotice = createMemo(() => selectedHistory() ?? currentNotice())

  return (
    <ModernDialog
      open={isOpen()}
      onClose={handleClose}
      labelledBy="ol-notice-dialog-title"
    >
      <Show
        when={!showHistory()}
        fallback={
          <>
            <div class="ol-dialog__head">
              <h2 class="ol-dialog__title" id="ol-notice-dialog-title">
                {t("home.notice.history_title")}
              </h2>
              <button
                type="button"
                class="ol-icon-btn"
                title={t("home.promo.close")}
                aria-label={t("home.promo.close")}
                onClick={handleClose}
              >
                <IClose size={16} />
              </button>
            </div>
            <div class="ol-dialog__body">
              <Show
                when={historyNotices().length > 0}
                fallback={
                  <div class="ol-empty">{t("home.notice.no_history")}</div>
                }
              >
                <div class="ol-history-list">
                  <For each={historyNotices()}>
                    {(item) => (
                      <div class="ol-history-item">
                        <div class="ol-history-item__head">
                          <span class="ol-history-item__title">
                            {item.title || t("home.notice.site_announcement")}
                          </span>
                          <Show when={item.updated_at}>
                            <span class="ol-history-item__date ol-tabular">
                              {formatDate(item.updated_at!)}
                            </span>
                          </Show>
                        </div>
                        <Show when={item.summary}>
                          <div class="ol-history-item__summary">
                            {item.summary}
                          </div>
                        </Show>
                        <Show when={item.content}>
                          <div style={{ "margin-top": "8px" }}>
                            <Markdown children={item.content} sanitize />
                          </div>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
            <div class="ol-dialog__foot">
              <button
                type="button"
                class="ol-link-btn"
                style={{ "margin-right": "auto", "font-size": "13px" }}
                onClick={() => setShowHistory(false)}
              >
                {t("home.notice.back_current")}
              </button>
              <button
                type="button"
                class="ol-btn ol-btn--primary"
                onClick={handleClose}
              >
                {t("home.notice.acknowledge")}
              </button>
            </div>
          </>
        }
      >
        <Show when={displayNotice()}>
          {(n) => (
            <>
              <div class="ol-dialog__head">
                <h2 class="ol-dialog__title" id="ol-notice-dialog-title">
                  <span
                    class="ol-sev"
                    data-severity={n().severity}
                    style={{ "margin-bottom": "6px", display: "flex" }}
                  >
                    <SeverityIcon severity={n().severity} />
                    {severityLabel(n().severity)}
                  </span>
                  {n().title || t("home.notice.site_announcement")}
                  <Show when={n().updated_at}>
                    <span class="ol-dialog__sub ol-tabular">
                      {t("home.notice.updated_at", {
                        date: formatDate(n().updated_at!),
                      })}
                    </span>
                  </Show>
                </h2>
                <button
                  type="button"
                  class="ol-icon-btn"
                  title={t("home.promo.close")}
                  aria-label={t("home.promo.close")}
                  onClick={handleClose}
                >
                  <IClose size={16} />
                </button>
              </div>
              <div class="ol-dialog__body">
                <Markdown children={n().content || n().summary} sanitize />
              </div>
              <div class="ol-dialog__foot">
                <button
                  type="button"
                  class="ol-link-btn"
                  style={{ "margin-right": "auto", "font-size": "13px" }}
                  onClick={() => setShowHistory(true)}
                >
                  {t("home.notice.history_btn")}
                </button>
                <button
                  type="button"
                  class="ol-btn ol-btn--primary"
                  onClick={handleClose}
                >
                  {t("home.notice.acknowledge")}
                </button>
              </div>
            </>
          )}
        </Show>
      </Show>
    </ModernDialog>
  )
}
