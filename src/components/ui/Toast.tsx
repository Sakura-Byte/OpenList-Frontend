import { Toast as KobalteToast, toaster } from "@kobalte/core/toast"
import {
  TbAlertCircle,
  TbAlertTriangle,
  TbCircleCheck,
  TbInfoCircle,
} from "solid-icons/tb"
import { JSXElement, Match, Show, Switch } from "solid-js"
import { Portal } from "solid-js/web"
import { IClose } from "~/components/icons-tb"
import "./ui.css"

export type OlToastStatus = "success" | "error" | "info" | "warning" | "custom"

export function showOlToast(options: {
  status: OlToastStatus
  title?: string
  render?: () => JSXElement
}) {
  return toaster.show((toastProps) => (
    <KobalteToast
      toastId={toastProps.toastId}
      class="ol-toast"
      data-status={options.status}
    >
      <Show when={options.status !== "custom"}>
        <span class="ol-toast__icon">
          <Switch>
            <Match when={options.status === "success"}>
              <TbCircleCheck size={18} class="ol-ico" />
            </Match>
            <Match when={options.status === "error"}>
              <TbAlertCircle size={18} class="ol-ico" />
            </Match>
            <Match when={options.status === "warning"}>
              <TbAlertTriangle size={18} class="ol-ico" />
            </Match>
            <Match when={options.status === "info"}>
              <TbInfoCircle size={18} class="ol-ico" />
            </Match>
          </Switch>
        </span>
      </Show>

      <div class="ol-toast__body">
        <Show
          when={options.render}
          fallback={
            <KobalteToast.Description>{options.title}</KobalteToast.Description>
          }
        >
          {options.render!()}
        </Show>
      </div>

      <KobalteToast.CloseButton class="ol-toast__close" aria-label="Close">
        <IClose size={14} />
      </KobalteToast.CloseButton>
    </KobalteToast>
  ))
}

export const OlToastRegion = () => {
  return (
    <Portal>
      <div class="ol-modern-scope ol-toast-region">
        <KobalteToast.Region duration={3200} limit={5}>
          <KobalteToast.List class="ol-toast-list" />
        </KobalteToast.Region>
      </div>
    </Portal>
  )
}
