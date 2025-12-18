import { createLocalStorage } from "@solid-primitives/storage"
import { isMobile } from "~/utils/compatibility"

const [local, setLocal, { remove, clear, toJSON }] = createLocalStorage()
// export function isValidKey(
//   key: string | number | symbol,
//   object: object
// ): key is keyof typeof object {
//   return key in object
// }

type LocalSettingBase = {
  key: string
  default: string
  hidden?: boolean
}

export type LocalSetting =
  | (LocalSettingBase & { type?: undefined })
  | (LocalSettingBase & {
      type: "select"
      options: string[]
    })
  | (LocalSettingBase & {
      type: "boolean"
    })
  | (LocalSettingBase & {
      type: "number"
      min?: number
    })

export const initialLocalSettings: LocalSetting[] = [
  {
    key: "aria2_rpc_url",
    default: "http://localhost:6800/jsonrpc",
  },
  {
    key: "aria2_rpc_secret",
    default: "",
  },
  {
    key: "package_download_retry_times",
    default: "3",
    type: "number",
    min: 0,
  },
  {
    key: "package_download_retry_sleep_ms",
    default: "1000",
    type: "number",
    min: 0,
  },
  {
    key: "package_download_retry_exp",
    default: "false",
    type: "boolean",
  },
  {
    key: "global_default_layout",
    default: "list",
    type: "select",
    options: ["list", "grid", "image"],
  },
  {
    key: "show_folder_in_image_view",
    default: "top",
    type: "select",
    options: ["top", "bottom", "none"],
  },
  {
    key: "show_sidebar",
    default: "none",
    type: "select",
    options: ["none", "visible"],
  },
  {
    key: "show_count_msg",
    default: "none",
    type: "select",
    options: ["none", "visible"],
  },
  {
    key: "position_of_header_navbar",
    default: "static",
    type: "select",
    options: ["static", "sticky", "only_navbar_sticky"],
  },
  {
    key: "grid_item_size",
    default: "90",
    type: "number",
  },
  {
    key: "list_item_filename_overflow",
    default: "ellipsis",
    type: "select",
    options: ["ellipsis", "scrollable", "multi_line"],
  },
  {
    key: "open_item_on_checkbox",
    default: "direct",
    type: "select",
    options: ["direct", "dblclick", "disable_while_checked"],
    hidden: false,
  },
  {
    key: "editor_font_size",
    default: "14",
    type: "number",
  },
]
for (const setting of initialLocalSettings) {
  if (!local[setting.key]) {
    setLocal(setting.key, setting.default)
  }
}

export { local, setLocal, remove, clear, toJSON }
