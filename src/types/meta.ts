export interface AsmrWorkMeta {
  id?: number
  source_id?: string
  title?: string
  circle?: string
  release?: string
  cover?: string
  vas?: string[]
  tags?: string[]
  introduction?: string
}

export interface DirInfo {
  readme?: string
  source_note?: string
  archive_passwords?: string[]
  cover?: string
  extra?: {
    asmrone_work?: AsmrWorkMeta
    [key: string]: unknown
  }
  asmrone_work?: AsmrWorkMeta
}

export interface Meta {
  id: number
  path: string
  password: string
  read_users: number[]
  read_users_sub: boolean
  write_users: number[]
  write_users_sub: boolean
  p_sub: boolean
  write: boolean
  w_sub: boolean
  hide: string
  h_sub: boolean
  readme: string
  r_sub: boolean
  header: string
  header_sub: boolean
  source_note: string
  source_sub: boolean
  archive_passwords: string[]
  archive_passwords_sub: boolean
  stop_header: boolean
  stop_readme: boolean
}

export type MetaGridUpdate = Omit<
  Meta,
  "read_users" | "read_users_sub" | "write_users" | "write_users_sub"
>
