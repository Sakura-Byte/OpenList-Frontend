import { createSignal } from "solid-js"
import { User, UserMethods, UserPermissions } from "~/types"
import { setApiRpsLimit } from "~/utils"

export type Me = User & { otp: boolean }
const [me, _setMe] = createSignal<Me>({} as Me)

const setMe = (value: Me | ((prev: Me) => Me)) => {
  const next = typeof value === "function" ? value(me()) : value
  _setMe(next)
  setApiRpsLimit({
    download: next.download_rps_effective ?? 0,
    list: next.list_rps_effective ?? 0,
    search: next.search_rps_effective ?? 0,
  })
}

type Permission = (typeof UserPermissions)[number]
export const userCan = (p: Permission) => {
  const u = me()
  return UserMethods.can(u, UserPermissions.indexOf(p))
}

export { me, setMe }
