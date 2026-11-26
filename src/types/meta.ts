export interface DirInfo {
  readme?: string
  source_note?: string
  archive_passwords?: string[]
  cover?: string
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
