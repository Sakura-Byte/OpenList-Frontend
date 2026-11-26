import { Dialog as KobalteDialog } from "@kobalte/core/dialog"
import { JSXElement, Show } from "solid-js"
import { IClose } from "~/components/icons-tb"
import "./ui.css"

export type OlDialogSize = "sm" | "md" | "lg" | "xl"

export interface OlDialogProps {
  open: boolean
  onClose: () => void
  title?: JSXElement
  headerExtra?: JSXElement
  footer?: JSXElement
  children?: JSXElement
  size?: OlDialogSize
  showCloseButton?: boolean
  onDrop?: (e: DragEvent) => void
  onOpenAutoFocus?: (e: Event) => void
}

export const OlDialog = (props: OlDialogProps) => {
  return (
    <KobalteDialog
      open={props.open}
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onClose()
      }}
      modal={true}
      preventScroll={false}
    >
      <KobalteDialog.Portal>
        <div class="ol-modern-scope">
          <KobalteDialog.Overlay class="ol-kb-overlay" />
          <div class="ol-kb-positioner">
            <KobalteDialog.Content
              class="ol-kb-dialog"
              data-size={props.size ?? "md"}
              onDrop={props.onDrop}
              onOpenAutoFocus={props.onOpenAutoFocus}
            >
              <Show
                when={props.title || props.headerExtra || props.showCloseButton}
              >
                <div class="ol-kb-header">
                  <div class="ol-kb-header__main">
                    <Show when={props.title}>
                      <KobalteDialog.Title class="ol-kb-title">
                        {props.title}
                      </KobalteDialog.Title>
                    </Show>
                    <Show when={props.headerExtra}>{props.headerExtra}</Show>
                  </div>
                  <Show when={props.showCloseButton}>
                    <KobalteDialog.CloseButton
                      class="ol-icon-btn"
                      aria-label="Close"
                    >
                      <IClose size={16} />
                    </KobalteDialog.CloseButton>
                  </Show>
                </div>
              </Show>

              <div class="ol-kb-body">{props.children}</div>

              <Show when={props.footer}>
                <div class="ol-kb-footer">{props.footer}</div>
              </Show>
            </KobalteDialog.Content>
          </div>
        </div>
      </KobalteDialog.Portal>
    </KobalteDialog>
  )
}
