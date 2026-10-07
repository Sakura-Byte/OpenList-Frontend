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
    //
    // 服务端在非 2xx 时同样返回 { code, message, data } 结构（例如初始化
    // 失败会给出 data.reason 说明具体原因）。这里把响应体透传出来：
    //   - message 优先用服务端的文案，避免用户只看到 axios 的
    //     "Request failed with status code 500"；
    //   - data 仅当服务端**确实返回了非空 data** 时才带上（见下方说明）。
    // 网络错误/超时没有 response，退回 axios 的 message。
    //
    // 为什么不能无条件带上 data（哪怕只是 `data: null`）：
    // 分片上传的 mpRequest（pages/home/uploads/multipart.ts）靠「错误对象里
    // 没有 data 键」区分「传输层失败」与「服务端信封」——服务端信封一律带 data。
    // 若这里补一个 data: null，CDN / 网关错误（响应体是 HTML，body.data 为
    // undefined）也会变成"信封"，流控与重试分支会被误判。故仅在 data != null
    // 时附加。
    const body = error.response?.data as
      { message?: string; data?: unknown } | undefined
    const result: {
      code: number | undefined
      message: string
      data?: unknown
    } = {
      code: axios.isCancel(error) ? -1 : error.response?.status,
      message: body?.message || error.message,
    }
    if (body && typeof body === "object" && body.data != null) {
      result.data = body.data
    }
    return result
  },
)

instance.defaults.headers.common["Authorization"] =
  localStorage.getItem("token") || ""

export const changeToken = (token?: string) => {
  instance.defaults.headers.common["Authorization"] = token ?? ""
  localStorage.setItem("token", token ?? "")
}

export { instance as r, setApiRpsLimit }
