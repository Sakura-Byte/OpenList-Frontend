import axios, { InternalAxiosRequestConfig } from "axios"
import { api, log } from "."

type RpsKind = "download" | "list" | "search"

type ThrottleState = {
  limit: number
  nextAvailable: number
  chain: Promise<void>
}

const createThrottleState = (): ThrottleState => ({
  limit: 0,
  nextAvailable: Date.now(),
  chain: Promise.resolve(),
})

const throttleStates: Record<RpsKind, ThrottleState> = {
  download: createThrottleState(),
  list: createThrottleState(),
  search: createThrottleState(),
}

const setApiRpsLimit = (limits?: Partial<Record<RpsKind, number | null>>) => {
  ;(["download", "list", "search"] as const).forEach((kind) => {
    const limit = limits?.[kind]
    const state = throttleStates[kind]
    state.limit = limit && limit > 0 ? limit : 0
    state.nextAvailable = Date.now()
  })
}

const throttleRequest = async (state: ThrottleState) => {
  if (state.limit <= 0) return
  const now = Date.now()
  if (state.nextAvailable < now) {
    state.nextAvailable = now
  }
  const wait = Math.max(0, state.nextAvailable - now)
  const interval = Math.max(1, Math.floor(1000 / state.limit))
  state.nextAvailable += interval
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
}

const resolveKind = (config: InternalAxiosRequestConfig): RpsKind => {
  if (config.rpsKind) {
    return config.rpsKind
  }
  const url = config.url || ""
  if (url.includes("/fs/search")) {
    return "search"
  }
  if (url.includes("/fs/get")) {
    return "download"
  }
  if (
    url.includes("/fs/archive/list") ||
    url.includes("/fs/archive/meta") ||
    url.includes("/fs/list")
  ) {
    return "list"
  }
  return "list"
}

const instance = axios.create({
  baseURL: api + "/api",
  // timeout: 5000
  headers: {
    "Content-Type": "application/json;charset=utf-8",
    // 'Authorization': localStorage.getItem("admin-token") || "",
  },
  withCredentials: false,
})

instance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const kind = resolveKind(config)
    const state = throttleStates[kind]
    state.chain = state.chain.then(() => throttleRequest(state)).catch(() => {})
    await state.chain
    return config
  },
  (error) => {
    // do something with request error
    console.log("Error: " + error.message) // for debug
    return Promise.reject(error)
  },
)

// response interceptor
instance.interceptors.response.use(
  (response) => {
    const resp = response.data
    log(resp)
    // if (resp.code === 401) {
    //   notify.error(resp.message);
    //   bus.emit(
    //     "to",
    //     `/@login?redirect=${encodeURIComponent(window.location.pathname)}`
    //   );
    // }
    return resp
  },
  (error) => {
    // response error
    console.error(error) // for debug
    // notificationService.show({
    //   status: "danger",
    //   title: error.code,
    //   description: error.message,
    // });
    return {
      code: axios.isCancel(error) ? -1 : error.response?.status,
      message: error.message,
    }
  },
)

instance.defaults.headers.common["Authorization"] =
  localStorage.getItem("token") || ""

export const changeToken = (token?: string) => {
  instance.defaults.headers.common["Authorization"] = token ?? ""
  localStorage.setItem("token", token ?? "")
}

export { instance as r, setApiRpsLimit }
