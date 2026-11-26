import { IconTypes } from "solid-icons"
import {
  TbArchive,
  TbCopy,
  TbDownload,
  TbEdit,
  TbExternalLink,
  TbFileArrowRight,
  TbFilePlus,
  TbFolderMinus,
  TbFolderPlus,
  TbFolderUp,
  TbLink,
  TbMagnet,
  TbReplace,
  TbShare,
  TbTrash,
  TbX,
} from "solid-icons/tb"

export interface Operations {
  [key: string]: {
    icon: IconTypes
    color?: string
    p?: boolean
  }
}

export const operations: Operations = {
  open_with: { icon: TbExternalLink },
  rename: { icon: TbEdit },
  copy: { icon: TbCopy },
  move: { icon: TbFileArrowRight },
  delete: { icon: TbTrash, color: "var(--ol-danger)" },
  decompress: { icon: TbArchive },
  copy_link: { icon: TbLink },
  mkdir: { icon: TbFolderPlus },
  recursive_move: { icon: TbFolderUp },
  remove_empty_directory: { icon: TbFolderMinus },
  batch_rename: { icon: TbReplace },
  new_file: { icon: TbFilePlus },
  cancel_select: { icon: TbX },
  download: { icon: TbDownload },
  share: { icon: TbShare },
  offline_download_torrent: { icon: TbMagnet },
}
