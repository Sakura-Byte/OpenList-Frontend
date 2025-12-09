import "axios"

declare module "axios" {
  type RequestRpsKind = "download" | "list" | "search"

  export interface AxiosRequestConfig {
    rpsKind?: RequestRpsKind
  }

  export interface InternalAxiosRequestConfig {
    rpsKind?: RequestRpsKind
  }
}
