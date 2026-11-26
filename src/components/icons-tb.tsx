import { Component, JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import {
  TbAlertTriangle,
  TbApps,
  TbArchive,
  TbArrowDown,
  TbArrowUp,
  TbBadgeCc,
  TbBook2,
  TbBrandAndroid,
  TbBrandApple,
  TbBrandGithub,
  TbBrandTelegram,
  TbBrandWindows,
  TbCheck,
  TbCheckbox,
  TbClockHour4,
  TbCloudUpload,
  TbCode,
  TbCopy,
  TbDisc,
  TbDots,
  TbDownload,
  TbEdit,
  TbExternalLink,
  TbEye,
  TbFileArrowRight,
  TbFileCode,
  TbFileDescription,
  TbFilePlus,
  TbFileSpreadsheet,
  TbFileText,
  TbFileUnknown,
  TbFileZip,
  TbFolderMinus,
  TbFolderPlus,
  TbFolderUp,
  TbGauge,
  TbInfoCircle,
  TbKey,
  TbLayoutCards,
  TbLayoutGrid,
  TbLink,
  TbList,
  TbLogin,
  TbMagnet,
  TbMoon,
  TbMovie,
  TbMusic,
  TbPhoto,
  TbPlayerPause,
  TbPlayerPlay,
  TbPlayerSkipBack,
  TbPlayerSkipForward,
  TbRefresh,
  TbReplace,
  TbSearch,
  TbSettings,
  TbShare,
  TbSpeakerphone,
  TbSun,
  TbTrash,
  TbUser,
  TbWorld,
  TbX,
} from "solid-icons/tb"
import { isArchive } from "~/store/archive"

/*
 * Single icon family for OpenList-Frontend: Tabler (solid-icons/tb).
 * Stroke weight is unified in CSS (.ol-ico { stroke-width: 1.75 }),
 * sizes are 14 / 16 / 18 / 20. Zero emoji icons anywhere.
 */

export type IconProps = {
  size?: number
  class?: string
  style?: JSX.CSSProperties
}
export type TablerIcon = typeof TbSearch

const make =
  (Icon: TablerIcon, fallbackSize = 18): Component<IconProps> =>
  (p) => (
    <Icon
      size={p.size ?? fallbackSize}
      class={`ol-ico ${p.class ?? ""}`}
      style={p.style}
    />
  )

export const ISearch = make(TbSearch)
export const IList = make(TbList)
export const IGrid = make(TbLayoutGrid)
export const IImage = make(TbPhoto)
export const IPoster = make(TbLayoutCards)
export const ISun = make(TbSun)
export const IMoon = make(TbMoon)
export const IDownload = make(TbDownload)
export const ILink = make(TbLink)
export const IMore = make(TbDots)
export const IClose = make(TbX)
export const IArrowUp = make(TbArrowUp)
export const IArrowDown = make(TbArrowDown)
export const ICopy = make(TbCopy)
export const ICheck = make(TbCheck)
export const IEye = make(TbEye)
export const IKey = make(TbKey)
export const IAlert = make(TbAlertTriangle)
export const IInfo = make(TbInfoCircle)
export const IMegaphone = make(TbSpeakerphone)
export const ITelegram = make(TbBrandTelegram)
export const IGithub = make(TbBrandGithub)
export const IExternal = make(TbExternalLink)
export const IClock = make(TbClockHour4)
export const IGauge = make(TbGauge)
export const IWorld = make(TbWorld)
export const ICode = make(TbCode)
export const IUser = make(TbUser)
export const ILogin = make(TbLogin)
export const ISettings = make(TbSettings)
export const IRefresh = make(TbRefresh)
export const IUpload = make(TbCloudUpload)
export const IFolderPlus = make(TbFolderPlus)
export const IFolderMinus = make(TbFolderMinus)
export const IFolderUp = make(TbFolderUp)
export const IFilePlus = make(TbFilePlus)
export const IFileMove = make(TbFileArrowRight)
export const ITrash = make(TbTrash)
export const IEdit = make(TbEdit)
export const IReplace = make(TbReplace)
export const IShare = make(TbShare)
export const IArchive = make(TbArchive)
export const IMagnet = make(TbMagnet)
export const ICheckbox = make(TbCheckbox)
export const IPlay = make(TbPlayerPlay)
export const IPause = make(TbPlayerPause)
export const ISkipBack = make(TbPlayerSkipBack)
export const ISkipForward = make(TbPlayerSkipForward)

// ---------------------------------------------------------------------------
// File types
// ---------------------------------------------------------------------------

export type FileKind =
  | "folder"
  | "archive"
  | "video"
  | "audio"
  | "image"
  | "pdf"
  | "doc"
  | "sheet"
  | "book"
  | "subtitle"
  | "text"
  | "code"
  | "windows"
  | "android"
  | "apple"
  | "app"
  | "disc"
  | "torrent"
  | "other"

const EXT_KIND: Record<string, FileKind> = {}
const reg = (kind: FileKind, exts: string) =>
  exts.split(",").forEach((e) => (EXT_KIND[e] = kind))

reg("archive", "zip,7z,rar,tar,gz,tgz,bz2,xz,zst,001,002")
reg("video", "mp4,mkv,mov,webm,avi,flv,ts,m2ts,wmv,m4v,rmvb,m3u8")
reg("audio", "mp3,flac,wav,aac,ogg,m4a,opus,ape,wma,dsf")
reg("image", "png,jpg,jpeg,webp,gif,avif,bmp,heic,svg,tif,tiff,psd,ai")
reg("pdf", "pdf")
reg("doc", "doc,docx,ppt,pptx,rtf,odt")
reg("sheet", "xls,xlsx,csv,ods")
reg("book", "epub,mobi,azw3,cbz,cbr,fb2")
reg("subtitle", "ass,ssa,srt,vtt,lrc,sub,sup")
reg("text", "txt,md,nfo,log,ini,cue,url")
reg(
  "code",
  "json,yaml,yml,js,ts,tsx,jsx,py,go,rs,c,cpp,sh,bat,ps1,html,css,xml,sql,db",
)
reg("windows", "exe,msi")
reg("android", "apk,xapk")
reg("apple", "dmg,ipa,pkg,plist,tipa")
reg("disc", "iso,mdf,mds,bin,img")
reg("torrent", "torrent")

export function fileExt(name: string) {
  const i = name.lastIndexOf(".")
  return i > 0 ? name.slice(i + 1).toLowerCase() : ""
}

export function fileKind(name: string, isDir: boolean, type = 0): FileKind {
  if (isDir || type === 1) return "folder"
  const e = fileExt(name)
  const k = EXT_KIND[e]
  if (k) return k
  if (isArchive(name)) return "archive"
  return (
    (
      {
        2: "video",
        3: "audio",
        4: "text",
        5: "image",
      } as Record<number, FileKind>
    )[type] ?? "other"
  )
}

export const KIND_COLOR: Record<FileKind, string> = {
  folder: "var(--ol-type-folder)",
  archive: "var(--ol-type-archive)",
  video: "var(--ol-type-video)",
  audio: "var(--ol-type-audio)",
  image: "var(--ol-type-image)",
  pdf: "var(--ol-type-pdf)",
  doc: "var(--ol-type-doc)",
  sheet: "var(--ol-type-sheet)",
  book: "var(--ol-type-book)",
  subtitle: "var(--ol-type-text)",
  text: "var(--ol-type-text)",
  code: "var(--ol-type-text)",
  windows: "var(--ol-type-app)",
  android: "var(--ol-type-app)",
  apple: "var(--ol-type-app)",
  app: "var(--ol-type-app)",
  disc: "var(--ol-type-app)",
  torrent: "var(--ol-type-text)",
  other: "var(--ol-type-text)",
}

export const KIND_GLYPH: Record<Exclude<FileKind, "folder">, TablerIcon> = {
  archive: TbFileZip,
  video: TbMovie,
  audio: TbMusic,
  image: TbPhoto,
  pdf: TbFileDescription,
  doc: TbFileDescription,
  sheet: TbFileSpreadsheet,
  book: TbBook2,
  subtitle: TbBadgeCc,
  text: TbFileText,
  code: TbFileCode,
  windows: TbBrandWindows,
  android: TbBrandAndroid,
  apple: TbBrandApple,
  app: TbApps,
  disc: TbDisc,
  torrent: TbMagnet,
  other: TbFileUnknown,
}

export const kindColor = (k: FileKind) => KIND_COLOR[k]

/** Two-tone folder; the front face uses the site's main colour. */
export const FolderGlyph: Component<{
  size?: number
  class?: string
  style?: JSX.CSSProperties
}> = (p) => {
  const s = () => p.size ?? 20
  return (
    <svg
      class={`ol-type-icon ol-folder ${p.class ?? ""}`}
      width={s()}
      height={s()}
      viewBox="0 0 24 24"
      style={p.style}
      aria-hidden="true"
    >
      <path
        class="ol-folder__back"
        d="M2.5 6.2A2.2 2.2 0 0 1 4.7 4h4.1c.5 0 1 .2 1.4.6L11.8 6h7.5a2.2 2.2 0 0 1 2.2 2.2V9H2.5V6.2Z"
      />
      <path
        class="ol-folder__front"
        d="M2.5 8.6c0-.7.6-1.3 1.3-1.3h16.4c.7 0 1.3.6 1.3 1.3v9.2a2.2 2.2 0 0 1-2.2 2.2H4.7a2.2 2.2 0 0 1-2.2-2.2V8.6Z"
      />
    </svg>
  )
}

/** Small icon for list rows, search results and breadcrumbs (16–20px). */
export const FileIcon: Component<{
  kind: FileKind
  size?: number
  class?: string
}> = (p) => {
  const size = () => p.size ?? 20
  return (
    <Show
      when={p.kind !== "folder"}
      fallback={<FolderGlyph size={size()} class={p.class} />}
    >
      <Dynamic
        component={KIND_GLYPH[p.kind as Exclude<FileKind, "folder">]}
        size={size()}
        class={`ol-ico ol-type-icon ${p.class ?? ""}`}
        style={{ color: KIND_COLOR[p.kind] }}
      />
    </Show>
  )
}

/**
 * Large icon for the grid view: a document with a folded corner, the type
 * glyph, and the real extension printed on a tab (7Z / RAR / MKV / FLAC…).
 */
export const FileTile: Component<{ name: string; kind: FileKind }> = (p) => {
  const ext = () => fileExt(p.name).slice(0, 4).toUpperCase()
  return (
    <Show
      when={p.kind !== "folder"}
      fallback={
        <span class="ol-ftile ol-ftile--folder">
          <FolderGlyph size={56} />
        </span>
      }
    >
      <span
        class="ol-ftile"
        style={{ "--k": KIND_COLOR[p.kind] } as JSX.CSSProperties}
      >
        <svg
          class="ol-ftile__page"
          viewBox="0 0 40 50"
          width="40"
          height="50"
          aria-hidden="true"
        >
          <path d="M4.5.75h21.2l13.55 13.55V45.5a3.75 3.75 0 0 1-3.75 3.75H4.5A3.75 3.75 0 0 1 .75 45.5v-41A3.75 3.75 0 0 1 4.5.75Z" />
          <path
            class="ol-ftile__fold"
            d="M25.7.75v9.8a3.75 3.75 0 0 0 3.75 3.75h9.8"
          />
        </svg>
        <Dynamic
          component={KIND_GLYPH[p.kind as Exclude<FileKind, "folder">]}
          size={18}
          class="ol-ico ol-ftile__glyph"
        />
        <Show when={ext()}>
          <span class="ol-ftile__ext">{ext()}</span>
        </Show>
      </span>
    </Show>
  )
}

/** Site logo: the owner's image, falling back to a clean monogram. */
export const SiteLogo: Component<{
  src?: string
  title: string
  size?: number
}> = (p) => {
  const initials = () => {
    const raw = (p.title || "OL").trim()
    const parts = raw.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return Array.from(raw).slice(0, 2).join("").toUpperCase() || "OL"
  }
  return (
    <span
      class="ol-logo"
      style={{
        width: `${p.size ?? 28}px`,
        height: `${p.size ?? 28}px`,
      }}
    >
      <Show
        when={p.src}
        fallback={<span class="ol-logo__mono">{initials()}</span>}
      >
        <img
          src={p.src}
          alt=""
          referrerpolicy="no-referrer"
          onError={(e) => {
            const mono = document.createElement("span")
            mono.className = "ol-logo__mono"
            mono.textContent = initials()
            e.currentTarget.replaceWith(mono)
          }}
        />
      </Show>
    </span>
  )
}
