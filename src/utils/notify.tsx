import { JSXElement } from "solid-js"
import { showOlToast } from "~/components/ui"
import { firstUpperCase } from "."

const notify = {
  render: (element: JSXElement) => {
    showOlToast({
      status: "custom",
      render: () => element,
    })
  },
  success: (message: string) => {
    showOlToast({
      status: "success",
      title: firstUpperCase(message),
    })
  },
  error: (message: string) => {
    showOlToast({
      status: "error",
      title: firstUpperCase(message),
    })
  },
  info: (message: string) => {
    showOlToast({
      status: "info",
      title: firstUpperCase(message),
    })
  },
  warning: (message: string) => {
    showOlToast({
      status: "warning",
      title: firstUpperCase(message),
    })
  },
}

export { notify }
