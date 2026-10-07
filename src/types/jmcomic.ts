export interface ReaderInfo {
  kind: "album" | "chapter"
  mode: "client" | "server"
  album_id: string
  chapter_id?: string
}
export interface JMChapter {
  id: string
  name: string
  path: string
}
export interface JMPage {
  name: string
  url: string
  segments: number
  gif: boolean
}
export interface JMManifest {
  source: string
  mode: "client" | "server"
  album_id: string
  chapter_id?: string
  album_path: string
  title: string
  description: string
  authors: string[] | null
  tags: string[] | null
  date: string
  updated: number
  cover: string
  chapters: JMChapter[]
  pages: JMPage[]
}
