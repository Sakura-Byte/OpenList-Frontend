import { IconTypes } from "solid-icons"
import { TbFolder } from "solid-icons/tb"
import {
  FileKind,
  KIND_GLYPH,
  fileKind,
  FolderGlyph,
  FileIcon,
  FileTile,
} from "~/components/icons-tb"
import { Obj, ObjType } from "~/types"

export { FolderGlyph, FileIcon, FileTile, fileKind }
export type { FileKind }

export const getFileKindByObj = (
  obj: Pick<Obj, "type" | "name"> & { is_dir?: boolean },
): FileKind => {
  return fileKind(
    obj.name,
    Boolean(obj.is_dir || obj.type === ObjType.FOLDER),
    obj.type,
  )
}

export const getIconByTypeAndName = (type: number, name: string): IconTypes => {
  const kind = fileKind(name, type === ObjType.FOLDER, type)
  if (kind === "folder") {
    return TbFolder
  }
  return KIND_GLYPH[kind]
}

export const getIconByObj = (
  obj: Pick<Obj, "type" | "name"> & { is_dir?: boolean },
): IconTypes => {
  const effectiveType = obj.is_dir ? ObjType.FOLDER : obj.type
  return getIconByTypeAndName(effectiveType, obj.name)
}
