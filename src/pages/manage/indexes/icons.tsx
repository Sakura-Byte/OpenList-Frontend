import { TbCircleCheck, TbFile, TbFolder, TbLoader2 } from "solid-icons/tb"
import { JSX } from "solid-js"

export type IndexIconProps = {
  size?: number
  class?: string
  style?: JSX.CSSProperties
}

export function IndexRunningIcon(props: IndexIconProps) {
  return (
    <TbLoader2
      size={props.size ?? 20}
      class={`ol-ico ${props.class ?? ""}`}
      style={props.style}
    />
  )
}

export function IndexDoneIcon(props: IndexIconProps) {
  return (
    <TbCircleCheck
      size={props.size ?? 20}
      class={`ol-ico ${props.class ?? ""}`}
      style={props.style}
    />
  )
}

export function IndexFolderIcon(props: IndexIconProps) {
  return (
    <TbFolder
      size={props.size ?? 18}
      class={`ol-ico ${props.class ?? ""}`}
      style={props.style}
    />
  )
}

export function IndexFileIcon(props: IndexIconProps) {
  return (
    <TbFile
      size={props.size ?? 18}
      class={`ol-ico ${props.class ?? ""}`}
      style={props.style}
    />
  )
}

export const LineMdLoadingTwotoneLoop = IndexRunningIcon
export const LineMdConfirmCircleTwotone = IndexDoneIcon
