import { Icon } from "@hope-ui/solid"
import { useContextMenu } from "solid-contextmenu"
import { batch, createMemo, createSignal, Show } from "solid-js"
import { LinkWithPush } from "~/components"
import { usePath, useRouter, useUtil } from "~/hooks"
import {
  checkboxOpen,
  getMainColor,
  isPosterProvider,
  posterAspect,
  selectIndex,
} from "~/store"
import { StoreObj } from "~/types"
import { getIconByObj } from "~/utils/icon"
import { ItemCheckbox, useSelectWithMouse } from "./helper"

// Poster providers name works "RJ123456 Title"; the code reads better on its own line
const splitWorkCode = (name: string) => {
  const match = isPosterProvider() ? /^([A-Z]{2}\d+) (.+)$/.exec(name) : null
  return match ? { code: match[1], title: match[2] } : { title: name }
}

export const PosterItem = (props: { obj: StoreObj; index: number }) => {
  const { isHide } = useUtil()
  if (isHide(props.obj)) {
    return null
  }
  const { setPathAs } = usePath()
  const { show } = useContextMenu({ id: 1 })
  const { pushHref, to } = useRouter()
  const { openWithDoubleClick, toggleWithClick, restoreSelectionCache } =
    useSelectWithMouse()
  const [coverFailed, setCoverFailed] = createSignal(false)
  const label = createMemo(() => splitWorkCode(props.obj.name))
  return (
    <LinkWithPush
      classList={{ selected: !!props.obj.selected }}
      class="poster-item viselect-item"
      data-index={props.index}
      href={props.obj.name}
      title={props.obj.name}
      style={{
        "--poster-accent": getMainColor(),
        "--poster-aspect": posterAspect(),
        cursor:
          openWithDoubleClick() || toggleWithClick() ? "default" : "pointer",
      }}
      on:dblclick={() => {
        if (!openWithDoubleClick()) return
        selectIndex(props.index, true, true)
        to(pushHref(props.obj.name))
      }}
      on:click={(e: MouseEvent) => {
        e.preventDefault()
        if (openWithDoubleClick()) return
        if (e.ctrlKey || e.metaKey || e.shiftKey) return
        if (!restoreSelectionCache()) return
        if (toggleWithClick())
          return selectIndex(props.index, !props.obj.selected)
        to(pushHref(props.obj.name))
      }}
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
      <div class="poster-cover">
        <Show
          when={props.obj.thumb && !coverFailed()}
          fallback={
            <Icon
              color={getMainColor()}
              boxSize="40%"
              as={getIconByObj(props.obj)}
            />
          }
        >
          <img
            src={props.obj.thumb}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setCoverFailed(true)}
          />
        </Show>
        <Show when={checkboxOpen()}>
          <ItemCheckbox
            class="poster-checkbox"
            on:mousedown={(e: MouseEvent) => {
              e.stopPropagation()
            }}
            on:click={(e: MouseEvent) => {
              e.stopPropagation()
            }}
            checked={props.obj.selected}
            onChange={(e: any) => {
              selectIndex(props.index, e.target.checked)
            }}
          />
        </Show>
      </div>
      <div class="poster-body">
        <Show when={label().code}>
          <span class="poster-code">{label().code}</span>
        </Show>
        <span class="poster-title">{label().title}</span>
      </div>
    </LinkWithPush>
  )
}
