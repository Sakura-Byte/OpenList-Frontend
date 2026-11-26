import { useContextMenu } from "solid-contextmenu"
import { Show, batch, createMemo, createSignal } from "solid-js"
import { LinkWithPush } from "~/components"
import { FileTile, FolderGlyph, fileKind } from "~/components/icons-tb"
import { usePath, useRouter, useUtil } from "~/hooks"
import { posterAspect, selectIndex } from "~/store"
import { StoreObj } from "~/types"
import { useSelectWithMouse } from "./helper"

export function splitWorkCode(name: string): { code: string; title: string } {
  const match = /^((?:JM|RJ|VJ|BJ)\d+)\s+(.+)$/i.exec(name.trim())
  if (match) {
    return { code: match[1].toUpperCase(), title: match[2].trim() }
  }
  return { code: "", title: name }
}

function formatShortDate(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  if (d.getFullYear() <= 1971) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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
  const shortDate = createMemo(() => formatShortDate(props.obj.modified))
  const metaLine = createMemo(() =>
    [label().code, shortDate()].filter(Boolean).join(" · "),
  )
  const kind = createMemo(() =>
    fileKind(props.obj.name, props.obj.is_dir, props.obj.type),
  )

  let lastCheckShift = false

  const handleActivate = (e: MouseEvent) => {
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
      class="ol-poster poster-item grid-item viselect-item"
      classList={{ selected: !!props.obj.selected }}
      aria-selected={!!props.obj.selected}
      data-index={props.index}
      title={props.obj.name}
      style={{
        "--poster-aspect": posterAspect(),
      }}
      on:dblclick={() => {
        if (!openWithDoubleClick()) return
        selectIndex(props.index, true, true)
        to(pushHref(props.obj.name))
      }}
      onClick={handleActivate}
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
      <div class="ol-poster__cover poster-cover">
        <span
          class="ol-poster__check"
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

        <Show
          when={props.obj.thumb && !coverFailed()}
          fallback={
            props.obj.is_dir ? (
              <FolderGlyph size={48} />
            ) : (
              <FileTile name={props.obj.name} kind={kind()} />
            )
          }
        >
          <img
            src={props.obj.thumb}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setCoverFailed(true)}
          />
        </Show>
      </div>

      <LinkWithPush
        class="ol-poster__title poster-title"
        href={props.obj.name}
        onClick={(e: MouseEvent) => {
          if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            e.stopPropagation()
            handleActivate(e)
          } else {
            e.stopPropagation()
          }
        }}
      >
        {label().title}
      </LinkWithPush>

      <Show when={metaLine()}>
        <span class="ol-poster__meta poster-code ol-tabular">{metaLine()}</span>
      </Show>
    </div>
  )
}
