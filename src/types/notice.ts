export type NoticeSeverity = "info" | "warning" | "critical"
export type NoticeDisplayType = "auto" | "modal" | "top_banner" | "both"
export type NoticeDismissStrategy = "until_updated" | "24h" | "session"

export interface Notice {
  id: number
  title: string
  summary: string
  content: string
  version_hash: string
  severity: NoticeSeverity
  display_type: NoticeDisplayType
  dismiss_strategy: NoticeDismissStrategy
  path_prefix: string
  start_at?: string | null
  end_at?: string | null
  sort: number
  enabled: boolean
  created_at?: string
  updated_at?: string
}

export interface PublicNoticesData {
  active: Notice[]
  history: Notice[]
}
