import { Link } from "@solidjs/router"
import { IconTypes } from "solid-icons"
import { TbExternalLink } from "solid-icons/tb"
import { createMemo, For, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { useRouter, useT } from "~/hooks"
import { me } from "~/store"
import { UserMethods, UserRole } from "~/types"
import { joinBase } from "~/utils"
import { BackendKind, getBackendKind } from "~/utils/backend"
import { onClose } from "./Header"
import { SideMenuGroup, side_menu_groups } from "./sidemenu_items"

export interface SideMenuItemProps {
  title: string
  to: string
  /** Optional override path when current user is not an admin (e.g. Profile at /@manage) */
  nonAdminTo?: string
  /** Highlight active when pathname starts with this prefix */
  matchPrefix?: string
  /** Require exact path match */
  exact?: boolean
  icon?: IconTypes
  children?: SideMenuItemProps[]
  role?: number
  external?: true
  refresh?: true
  /** Restrict this item to specific backends (e.g. ["go"] or ["ts-worker"]). */
  backend?: BackendKind[]
}

export function isSideMenuItemVisible(item: SideMenuItemProps): boolean {
  if (item.backend && !item.backend.includes(getBackendKind())) return false
  if (!UserMethods.is_admin(me())) {
    if (item.role === undefined) return false
    if (item.role === UserRole.GENERAL && !UserMethods.is_general(me())) {
      return false
    }
  }
  return true
}

function normalizePath(p: string): string {
  if (!p) return "/"
  const trimmed = p.replace(/\/+$/, "")
  return trimmed || "/"
}

const SideMenuRow = (props: SideMenuItemProps) => {
  const { pathname } = useRouter()
  const t = useT()

  const resolvedTo = createMemo(() => {
    if (!UserMethods.is_admin(me()) && props.nonAdminTo) {
      return props.nonAdminTo
    }
    return props.to
  })

  const isActive = createMemo(() => {
    const cur = normalizePath(pathname())
    const target = normalizePath(resolvedTo())
    if (!UserMethods.is_admin(me()) && props.nonAdminTo) {
      return (
        cur === normalizePath(props.nonAdminTo) ||
        cur === normalizePath(props.to)
      )
    }
    if (props.exact) {
      return cur === target
    }
    if (props.matchPrefix) {
      const pref = normalizePath(props.matchPrefix)
      return cur === pref || cur.startsWith(`${pref}/`)
    }
    return cur === target
  })

  const isExternal = () =>
    Boolean(props.external || resolvedTo().startsWith("http"))

  const href = () => (isExternal() ? resolvedTo() : joinBase(resolvedTo()))

  const handleClick = (e: MouseEvent) => {
    onClose()
    if (props.refresh) {
      e.stopPropagation()
      e.preventDefault()
      window.open(href(), "_self")
    }
  }

  return (
    <Show
      when={!isExternal() && !props.refresh}
      fallback={
        <a
          class="ol-admin-nav-item"
          href={href()}
          target={isExternal() ? "_blank" : undefined}
          rel={isExternal() ? "noopener noreferrer" : undefined}
          onClick={handleClick}
        >
          <Show when={props.icon}>
            <Dynamic component={props.icon} size={17} class="ol-ico" />
          </Show>
          <span class="ol-admin-nav-item__label">{t(props.title)}</span>
          <Show when={isExternal()}>
            <TbExternalLink size={14} class="ol-ico ol-admin-nav-item__ext" />
          </Show>
        </a>
      }
    >
      <Link
        class="ol-admin-nav-item"
        href={href()}
        data-active={isActive() ? "true" : "false"}
        onClick={handleClick}
      >
        <Show when={props.icon}>
          <Dynamic component={props.icon} size={17} class="ol-ico" />
        </Show>
        <span class="ol-admin-nav-item__label">{t(props.title)}</span>
      </Link>
    </Show>
  )
}

const SideMenuGroupSection = (props: { group: SideMenuGroup }) => {
  const t = useT()
  const visibleItems = createMemo(() => {
    if (
      props.group.backend &&
      !props.group.backend.includes(getBackendKind())
    ) {
      return []
    }
    return props.group.items.filter(isSideMenuItemVisible)
  })

  return (
    <Show when={visibleItems().length > 0}>
      <div class="ol-admin-nav-group">
        <div class="ol-admin-nav-group__label">{t(props.group.title)}</div>
        <For each={visibleItems()}>{(item) => <SideMenuRow {...item} />}</For>
      </div>
    </Show>
  )
}

export const SideMenu = (props: {
  items?: SideMenuItemProps[]
  groups?: SideMenuGroup[]
}) => {
  const groups = () => props.groups ?? side_menu_groups
  return (
    <nav class="ol-admin-nav" aria-label="Admin navigation">
      <Show
        when={!props.items || props.groups}
        fallback={
          <div class="ol-admin-nav-group">
            <For each={(props.items ?? []).filter(isSideMenuItemVisible)}>
              {(item) => <SideMenuRow {...item} />}
            </For>
          </div>
        }
      >
        <For each={groups()}>
          {(group) => <SideMenuGroupSection group={group} />}
        </For>
      </Show>
    </nav>
  )
}
