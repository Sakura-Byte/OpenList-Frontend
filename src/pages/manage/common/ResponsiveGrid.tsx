import { JSXElement } from "solid-js"
import { getSetting } from "~/store"

export const ResponsiveGrid = (props: { children: JSXElement }) => {
  const isResponsive = () => getSetting("settings_layout") === "responsive"
  return (
    <div class={isResponsive() ? "ol-admin-form-grid" : "ol-admin-form-stack"}>
      {props.children}
    </div>
  )
}
