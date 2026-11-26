import { useContextMenu } from "solid-contextmenu"
import { Show, batch, createMemo, createSignal } from "solid-js"
import { LinkWithPush } from "~/components"
import { FileTile, fileKind } from "~/components/icons-tb"
import { usePath, useRouter, useUtil } from "~/hooks"
import { selectIndex } from "~/store"
import { ObjType, StoreObj } from "~/types"
import { bus } from "~/utils"
import { useSelectWithMouse } from "./helper"

export const GridItem = (props: { obj: StoreObj; index: number }) => {
  const { isHide } = useUtil()
  if (isHide(props.obj)) {
    return null
  }
  const { setPathAs } = usePath()
  const { show } = useContextMenu({ id: 1 })
  const { pushHref, to } = useRouter()
  const { openWithDoubleClick, toggleWithClick, restoreSelectionCache } =
    useSelectWithMouse()

  const [thumbFailed, setThumbFailed] = createSignal(false)
  const kind = createMemo(() =>
    fileKind(props.obj.name, props.obj.is_dir, props.obj.type),
  )

  let lastCheckShift = false

  const handleTileActivate = (e: MouseEvent) => {
    if (openWithDoubleClick()) return
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      selectIndex(props.index, !props.obj.selected, false, e.shiftKey)
      return
    }
    if (!restoreSelectionCache()) return
    if (toggleWithClick()) {
      selectIndex(props.index, !props.obj.selected)
      return
    }
    to(pushHref(props.obj.name))
  }

  return (
    <div
      class="ol-tile grid-item viselect-item"
      classList={{ selected: !!props.obj.selected }}
      aria-selected={!!props.obj.selected}
      data-index={props.index}
      title={props.obj.name}
      on:dblclick={() => {
        if (!openWithDoubleClick()) return
        selectIndex(props.index, true, true)
        to(pushHref(props.obj.name))
      }}
      onClick={handleTileActivate}
      onMouseEnter={() => {
        setPathAs(props.obj.name, props.obj.is_dir, true)
      }}
      onContextMenu={(e: MouseEvent) => {
        batch(() => {
          selectIndex(props.index, true, true)
        })
        show(e, { props: props.obj })
      }}
    >
      <span
        class="ol-tile__check"
        on:mousedown={(e: MouseEvent) => e.stopPropagation()}
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          class="ol-checkbox"
          aria-label={props.obj.name}
          checked={!!props.obj.selected}
          onClick={(e: MouseEvent) => {
            lastCheckShift = e.shiftKey
            e.stopPropagation()
          }}
          onChange={(e) => {
            const shift = lastCheckShift
            lastCheckShift = false
            selectIndex(props.index, e.currentTarget.checked, false, shift)
          }}
        />
      </span>

      <span
        class="ol-tile__media item-thumbnail"
        onClick={(e: MouseEvent) => {
          if (props.obj.type !== ObjType.IMAGE) return
          if (e.ctrlKey || e.metaKey || e.shiftKey) return
          if (!restoreSelectionCache()) return
          bus.emit("gallery", props.obj.name)
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <Show
          when={props.obj.thumb && !thumbFailed()}
          fallback={<FileTile name={props.obj.name} kind={kind()} />}
        >
          <img
            class="ol-tile__thumb"
            src={props.obj.thumb}
            alt=""
            loading="lazy"
            onError={() => setThumbFailed(true)}
          />
        </Show>
      </span>

      <LinkWithPush
        class="ol-tile__name"
        href={props.obj.name}
        onClick={(e: MouseEvent) => {
          if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            e.stopPropagation()
            handleTileActivate(e)
          } else {
            e.stopPropagation()
          }
        }}
      >
        {props.obj.name}
      </LinkWithPush>
    </div>
  )
}
