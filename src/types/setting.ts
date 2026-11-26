import { Type } from "."

export enum Group {
  SINGLE,
  SITE,
  STYLE,
  PREVIEW,
  GLOBAL,
  ARIA2,
  INDEX,
  SSO,
  LDAP,
  S3,
  FTP,
  TRAFFIC,
}
export enum Flag {
  PUBLIC,
  PRIVATE,
  READONLY,
  DEPRECATED,
}

export type AppearanceSurfaceMode = "solid" | "glass"

export interface FooterLinkItem {
  label: string
  url: string
  external?: boolean
}

export interface SettingItem {
  key: string
  value: string
  type: Type
  help: string
  options?: string
  group: Group
  flag: Flag
}
