import { Component, lazy, onMount } from "solid-js"
import { useManageTitle, useRouter, useT } from "~/hooks"
import { me } from "~/store"
import { UserMethods } from "~/types"
import { trimLeft } from "~/utils"
import { BackendKind } from "~/utils/backend"
import {
  settings_sub_items,
  side_menu_groups,
  SideMenuItem,
  task_sub_items,
} from "./sidemenu_items"

type RouteDef = {
  to: string
  component: Component
  backend?: BackendKind[]
}

const DashboardPage = lazy(() => import("./Dashboard"))
const ProfilePage = lazy(() => import("./users/Profile"))

const OverviewOrProfile: Component = () => {
  return UserMethods.is_admin(me()) ? <DashboardPage /> : <ProfilePage />
}

const RedirectTo = (props: { target: string }) => {
  const { to } = useRouter()
  onMount(() => {
    to(props.target, false, { replace: true })
  })
  return null
}

const Placeholder = (props: { title: string; to: string }) => {
  const t = useT()
  useManageTitle(props.title)
  return (
    <div class="ol-admin-page">
      <div class="ol-admin-empty">{t(props.title)}</div>
    </div>
  )
}

const explicit_routes: RouteDef[] = [
  {
    to: "",
    component: OverviewOrProfile,
  },
  {
    to: "/profile",
    component: ProfilePage,
  },
  {
    to: "/settings",
    component: () => <RedirectTo target="/@manage/settings/site" />,
  },
  ...settings_sub_items.map((item) => ({
    to: trimLeft(item.to, "/@manage"),
    backend: item.backend,
    component:
      item.component || (() => <Placeholder title={item.title} to={item.to} />),
  })),
  {
    to: "/tasks",
    backend: ["go"],
    component: () => <RedirectTo target="/@manage/tasks/offline_download" />,
  },
  ...task_sub_items.map((item) => ({
    to: trimLeft(item.to, "/@manage"),
    backend: item.backend,
    component:
      item.component || (() => <Placeholder title={item.title} to={item.to} />),
  })),
  {
    to: "/storages/add",
    component: lazy(() => import("./storages/AddOrEdit")),
  },
  {
    to: "/storages/edit/:id",
    component: lazy(() => import("./storages/AddOrEdit")),
  },
  {
    to: "/shares/add",
    component: lazy(() => import("./shares/AddOrEdit")),
  },
  {
    to: "/shares/edit/:id",
    component: lazy(() => import("./shares/AddOrEdit")),
  },
  {
    to: "/users/add",
    component: lazy(() => import("./users/AddOrEdit")),
  },
  {
    to: "/users/edit/:id",
    component: lazy(() => import("./users/AddOrEdit")),
  },
  {
    to: "/metas/add",
    component: lazy(() => import("./metas/AddOrEdit")),
  },
  {
    to: "/metas/edit/:id",
    component: lazy(() => import("./metas/AddOrEdit")),
  },
  {
    to: "/notices/add",
    backend: ["go"],
    component: lazy(() => import("./notices/AddOrEdit")),
  },
  {
    to: "/notices/edit/:id",
    backend: ["go"],
    component: lazy(() => import("./notices/AddOrEdit")),
  },
  {
    to: "/promotions/add",
    backend: ["go"],
    component: lazy(() => import("./promotions/AddOrEdit")),
  },
  {
    to: "/promotions/edit/:id",
    backend: ["go"],
    component: lazy(() => import("./promotions/AddOrEdit")),
  },
  {
    to: "/2fa",
    component: lazy(() => import("./users/2fa")),
  },
  {
    to: "/plugins/add",
    backend: ["ts-worker"],
    component: lazy(() => import("./plugins/AddPlugin")),
  },
  {
    to: "/plugins/config/:id",
    backend: ["ts-worker"],
    component: lazy(() => import("./plugins/ConfigPlugin")),
  },
  {
    to: "/messenger",
    component: lazy(() => import("./messenger/Messenger")),
  },
]

const buildRoutes = (): RouteDef[] => {
  const seen = new Set<string>(explicit_routes.map((r) => r.to))
  const list: RouteDef[] = [...explicit_routes]

  const addFromItems = (items: SideMenuItem[]) => {
    for (const item of items) {
      if (item.children) {
        addFromItems(item.children)
        continue
      }
      if (!item.component) continue
      const rel = trimLeft(item.to, "/@manage")
      if (seen.has(rel)) continue
      seen.add(rel)
      list.push({
        to: rel,
        backend: item.backend,
        component: item.component,
      })
    }
  }

  for (const group of side_menu_groups) {
    addFromItems(group.items)
  }

  return list
}

const routes = buildRoutes()
export { routes }
