import { Component, lazy } from "solid-js"
import { IconTypes } from "solid-icons"
import {
  TbArchive,
  TbArrowsLeftRight,
  TbChartBar,
  TbCloudUpload,
  TbCopy,
  TbDatabase,
  TbDatabaseExport,
  TbEye,
  TbFileArrowRight,
  TbInfoCircle,
  TbKey,
  TbLayoutCards,
  TbLayoutDashboard,
  TbListDetails,
  TbLogin,
  TbMagnet,
  TbPalette,
  TbPuzzle,
  TbSearch,
  TbServer,
  TbSettings,
  TbShare,
  TbSpeakerphone,
  TbSubtask,
  TbUser,
  TbUsers,
  TbWorld,
} from "solid-icons/tb"
import { Group, UserRole } from "~/types"
import { BackendKind } from "~/utils/backend"
import { SideMenuItemProps } from "./SideMenu"

export type SideMenuItem = SideMenuItemProps & {
  component?: Component
  children?: SideMenuItem[]
}

export interface SideMenuGroup {
  title: string
  backend?: BackendKind[]
  items: SideMenuItem[]
}

const CommonSettings = lazy(() => import("./settings/Common"))
const ProfilePage = lazy(() => import("./users/Profile"))

export const settings_sub_items: SideMenuItem[] = [
  {
    title: "manage.sidemenu.site",
    icon: TbWorld,
    to: "/@manage/settings/site",
    component: () => <CommonSettings group={Group.SITE} />,
  },
  {
    title: "manage.sidemenu.style",
    icon: TbPalette,
    to: "/@manage/settings/style",
    component: () => <CommonSettings group={Group.STYLE} />,
  },
  {
    title: "manage.sidemenu.preview",
    icon: TbEye,
    to: "/@manage/settings/preview",
    component: () => <CommonSettings group={Group.PREVIEW} />,
  },
  {
    title: "manage.sidemenu.global",
    icon: TbSettings,
    to: "/@manage/settings/global",
    component: () => <CommonSettings group={Group.GLOBAL} />,
  },
  {
    title: "manage.sidemenu.sso",
    icon: TbLogin,
    to: "/@manage/settings/sso",
    component: () => <CommonSettings group={Group.SSO} />,
  },
  {
    title: "manage.sidemenu.ldap",
    icon: TbKey,
    to: "/@manage/settings/ldap",
    component: () => <CommonSettings group={Group.LDAP} />,
  },
  {
    title: "manage.sidemenu.s3",
    icon: TbDatabase,
    to: "/@manage/settings/s3",
    backend: ["go"],
    component: lazy(() => import("./settings/S3")),
  },
  {
    title: "manage.sidemenu.ftp",
    icon: TbServer,
    to: "/@manage/settings/ftp",
    component: () => <CommonSettings group={Group.FTP} />,
  },
  {
    title: "manage.sidemenu.traffic",
    icon: TbArrowsLeftRight,
    to: "/@manage/settings/traffic",
    component: () => <CommonSettings group={Group.TRAFFIC} />,
  },
  {
    title: "manage.sidemenu.other",
    icon: TbSettings,
    to: "/@manage/settings/other",
    component: lazy(() => import("./settings/Other")),
  },
]

export const task_sub_items: SideMenuItem[] = [
  {
    title: "manage.sidemenu.offline_download",
    icon: TbMagnet,
    to: "/@manage/tasks/offline_download",
    role: UserRole.GENERAL,
    backend: ["go"],
    component: lazy(() => import("./tasks/offline_download")),
  },
  {
    title: "manage.sidemenu.upload",
    icon: TbCloudUpload,
    to: "/@manage/tasks/upload",
    role: UserRole.GENERAL,
    backend: ["go"],
    component: lazy(() => import("./tasks/Upload")),
  },
  {
    title: "manage.sidemenu.copy",
    icon: TbCopy,
    to: "/@manage/tasks/copy",
    role: UserRole.GENERAL,
    backend: ["go"],
    component: lazy(() => import("./tasks/Copy")),
  },
  {
    title: "manage.sidemenu.move",
    icon: TbFileArrowRight,
    to: "/@manage/tasks/move",
    role: UserRole.GENERAL,
    backend: ["go"],
    component: lazy(() => import("./tasks/Move")),
  },
  {
    title: "manage.sidemenu.decompress",
    icon: TbArchive,
    to: "/@manage/tasks/decompress",
    role: UserRole.GENERAL,
    backend: ["go"],
    component: lazy(() => import("./tasks/Decompress")),
  },
]

export const side_menu_groups: SideMenuGroup[] = [
  {
    title: "manage.groups.overview",
    items: [
      {
        title: "manage.sidemenu.overview",
        icon: TbLayoutDashboard as IconTypes,
        to: "/@manage",
        exact: true,
      },
      {
        title: "manage.sidemenu.profile",
        icon: TbUser as IconTypes,
        to: "/@manage/profile",
        nonAdminTo: "/@manage",
        role: UserRole.GUEST,
        component: ProfilePage,
      },
    ],
  },
  {
    title: "manage.groups.content",
    items: [
      {
        title: "manage.sidemenu.storages",
        icon: TbDatabase as IconTypes,
        to: "/@manage/storages",
        matchPrefix: "/@manage/storages",
        component: lazy(() => import("./storages/Storages")),
      },
      {
        title: "manage.sidemenu.metas",
        icon: TbListDetails as IconTypes,
        to: "/@manage/metas",
        matchPrefix: "/@manage/metas",
        component: lazy(() => import("./metas/Metas")),
      },
      {
        title: "manage.sidemenu.shares",
        icon: TbShare as IconTypes,
        to: "/@manage/shares",
        matchPrefix: "/@manage/shares",
        role: UserRole.GENERAL,
        component: lazy(() => import("./shares/Shares")),
      },
      {
        title: "manage.sidemenu.indexes",
        icon: TbSearch as IconTypes,
        to: "/@manage/indexes",
        matchPrefix: "/@manage/indexes",
        component: lazy(() => import("./indexes/index_page")),
      },
    ],
  },
  {
    title: "manage.groups.operations",
    backend: ["go"],
    items: [
      {
        title: "manage.sidemenu.notices",
        icon: TbSpeakerphone as IconTypes,
        to: "/@manage/notices",
        matchPrefix: "/@manage/notices",
        backend: ["go"],
        component: lazy(() => import("./notices/Notices")),
      },
      {
        title: "manage.sidemenu.promotions",
        icon: TbLayoutCards as IconTypes,
        to: "/@manage/promotions",
        matchPrefix: "/@manage/promotions",
        backend: ["go"],
        component: lazy(() => import("./promotions/Promotions")),
      },
      {
        title: "manage.sidemenu.download_stats",
        icon: TbChartBar as IconTypes,
        to: "/@manage/download_stats",
        matchPrefix: "/@manage/download_stats",
        backend: ["go"],
        component: lazy(() => import("./download-stats")),
      },
    ],
  },
  {
    title: "manage.groups.access",
    items: [
      {
        title: "manage.sidemenu.tasks",
        icon: TbSubtask as IconTypes,
        to: "/@manage/tasks/offline_download",
        matchPrefix: "/@manage/tasks",
        role: UserRole.GENERAL,
        backend: ["go"],
      },
      {
        title: "manage.sidemenu.users",
        icon: TbUsers as IconTypes,
        to: "/@manage/users",
        matchPrefix: "/@manage/users",
        component: lazy(() => import("./users/Users")),
      },
    ],
  },
  {
    title: "manage.groups.system",
    items: [
      {
        title: "manage.sidemenu.settings",
        icon: TbSettings as IconTypes,
        to: "/@manage/settings/site",
        matchPrefix: "/@manage/settings",
      },
      {
        title: "manage.sidemenu.backup-restore",
        icon: TbDatabaseExport as IconTypes,
        to: "/@manage/backup-restore",
        matchPrefix: "/@manage/backup-restore",
        component: lazy(() => import("./backup-restore")),
      },
      {
        title: "manage.sidemenu.plugins",
        icon: TbPuzzle as IconTypes,
        to: "/@manage/plugins",
        matchPrefix: "/@manage/plugins",
        backend: ["ts-worker"],
        component: lazy(() => import("./plugins")),
      },
      {
        title: "manage.sidemenu.about",
        icon: TbInfoCircle as IconTypes,
        to: "/@manage/about",
        matchPrefix: "/@manage/about",
        role: UserRole.GUEST,
        component: lazy(() => import("./About")),
      },
    ],
  },
]

export const side_menu_items: SideMenuItem[] = side_menu_groups.flatMap(
  (g) => g.items,
)
