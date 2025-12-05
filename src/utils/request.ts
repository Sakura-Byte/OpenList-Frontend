import axios from "axios"
import { api, log } from "."

let apiRpsLimit = 0
let nextAvailable = 0
let throttleChain: Promise<void> = Promise.resolve()

const setApiRpsLimit = (limit?: number | null) => {
  apiRpsLimit = limit && limit > 0 ? limit : 0
  nextAvailable = Date.now()
}

const throttleRequest = async () => {
  if (apiRpsLimit <= 0) return
  const now = Date.now()
  if (nextAvailable < now) {
    nextAvailable = now
  }
  const wait = Math.max(0, nextAvailable - now)
  const interval = Math.max(1, Math.floor(1000 / apiRpsLimit))
  nextAvailable += interval
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
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
  async (config) => {
    throttleChain = throttleChain.then(throttleRequest).catch(() => {})
    await throttleChain
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
