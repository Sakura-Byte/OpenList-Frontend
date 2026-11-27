import { Link } from "@solidjs/router"
import { createMemo, For, JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { useRouter, useT } from "~/hooks"
import { joinBase } from "~/utils"
import { isSideMenuItemVisible } from "../SideMenu"
import { task_sub_items } from "../sidemenu_items"

export interface TasksShellProps {
  title?: string
  subtitle?: string
  actions?: JSX.Element
  children: JSX.Element
}

function normalizePath(p: string): string {
  if (!p) return "/"
  const trimmed = p.replace(/\/+$/, "")
  return trimmed || "/"
}

export const TasksShell = (props: TasksShellProps) => {
  const t = useT()
  const { pathname } = useRouter()

  const visibleTabs = createMemo(() =>
    task_sub_items.filter(isSideMenuItemVisible),
  )

  const isActive = (to: string) =>
    normalizePath(pathname()) === normalizePath(to)

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">
            {props.title ?? t("manage.sidemenu.tasks")}
          </h1>
          <Show when={props.subtitle}>
            <p class="ol-admin-subtitle">{props.subtitle}</p>
          </Show>
        </div>
        <Show when={props.actions}>
          <div class="ol-admin-head__actions">{props.actions}</div>
        </Show>
      </div>

      <nav class="ol-admin-tabs" role="tablist">
        <For each={visibleTabs()}>
          {(item) => {
            const slug = item.to.split("/").pop() || ""
            const active = () => isActive(item.to)
            return (
              <Link
                class="ol-admin-tab"
                role="tab"
                href={joinBase(item.to)}
                data-active={active() ? "true" : "false"}
                aria-selected={active() ? "true" : "false"}
              >
                <Show when={item.icon}>
                  <Dynamic component={item.icon} size={15} class="ol-ico" />
                </Show>
                <span>
                  {t(`manage.tasks_tabs.${slug}`, undefined, t(item.title))}
                </span>
              </Link>
            )
          }}
        </For>
      </nav>

      {props.children}
    </div>
  )
}

export default TasksShell
