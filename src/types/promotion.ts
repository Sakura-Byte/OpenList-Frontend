export type PromotionSlot =
  | "popup_ad"
  | "header_banner"
  | "readme_sponsor"
  | "ad_recruit"
  | "subdir_sponsor"

export type PromotionFreqCap = "visit" | "session" | "12h" | "24h"

export interface Promotion {
  id: number
  slot: PromotionSlot
  title: string
  subtitle: string
  body: string
  image: string
  cta_url: string
  cta_text: string
  track_name: string
  track_piece: string
  close_delay_sec: number
  allow_snooze: boolean
  freq_cap: PromotionFreqCap
  path_prefix: string
  priority: number
  enabled: boolean
  created_at?: string
  updated_at?: string
}
