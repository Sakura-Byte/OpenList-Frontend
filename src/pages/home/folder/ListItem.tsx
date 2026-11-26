import { useContextMenu } from "solid-contextmenu"
import { Show, batch, createMemo } from "solid-js"
import { LinkWithPush } from "~/components"
import {
  FileIcon,
  IDownload,
  ILink,
  IMore,
  IPlay,
  fileKind,
} from "~/components/icons-tb"
import { useLink, usePath, useRouter, useT, useUtil } from "~/hooks"
import { OrderBy, objStore, selectIndex } from "~/store"
import { StoreObj } from "~/types"
import { formatDate, getFileSize } from "~/utils"
import {
  isAudioFilename,
  playObjInCurrentAsmrFolder,
} from "../asmrone/ASMRWorkView"
import { useSelectWithMouse } from "./helper"

export interface Col {
  name: OrderBy
  textAlign: "left" | "right"
  w: any
}

export const cols: Col[] = [
  { name: "name", textAlign: "left", w: { "@initial": "76%", "@md": "50%" } },
  { name: "size", textAlign: "right", w: { "@initial": "24%", "@md": "17%" } },
  { name: "modified", textAlign: "right", w: { "@initial": 0, "@md": "33%" } },
]

export const ListItem = (props: { obj: StoreObj; index: number }) => {
  const { isHide, copy } = useUtil()
  if (isHide(props.obj)) {
    return null
  }
  const t = useT()
  const { setPathAs } = usePath()
  const { show } = useContextMenu({ id: 1 })
  const { pathname, isShare, pushHref, to } = useRouter()
  const { rawLink, previewPage } = useLink()
  const { openWithDoubleClick, toggleWithClick, restoreSelectionCache } =
    useSelectWithMouse()

  const kind = createMemo(() =>
    fileKind(props.obj.name, props.obj.is_dir, props.obj.type),
  )

  let lastCheckShift = false

  const handleRowActivate = (e: MouseEvent) => {
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
      class="ol-row list-item viselect-item"
      classList={{ selected: !!props.obj.selected }}
      role="option"
      aria-selected={!!props.obj.selected}
      data-dir={props.obj.is_dir}
      data-index={props.index}
      on:dblclick={() => {
        if (!openWithDoubleClick()) return
        selectIndex(props.index, true, true)
        to(pushHref(props.obj.name))
      }}
      onClick={handleRowActivate}
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
        class="ol-row__check"
        on:mousedown={(e: MouseEvent) => e.stopPropagation()}
        onClick={(e: MouseEvent) => e.stopPropagation()}
      >
        <FileIcon kind={kind()} size={20} />
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

      <span class="ol-row__name name-box" title={props.obj.name}>
        <LinkWithPush
          class="ol-row__name-text name"
          href={props.obj.name}
          onClick={(e: MouseEvent) => {
            if (e.button === 0 && !e.ctrlKey && !e.metaKey) {
              e.preventDefault()
              e.stopPropagation()
              handleRowActivate(e)
            } else {
              e.stopPropagation()
            }
          }}
        >
          {props.obj.name}
        </LinkWithPush>

        <span
          class="ol-row__actions"
          on:mousedown={(e: MouseEvent) => e.stopPropagation()}
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          <Show
            when={
              !props.obj.is_dir &&
              isAudioFilename(props.obj.name, props.obj.type) &&
              (objStore.provider === "ASMR.ONE" ||
                Boolean(
                  objStore.dir_info?.extra?.asmrone_work ??
                  objStore.dir_info?.asmrone_work,
                ))
            }
          >
            <button
              type="button"
              class="ol-icon-btn"
              title={t("home.asmr.play_track")}
              aria-label={t("home.asmr.play_track")}
              onClick={() => {
                playObjInCurrentAsmrFolder(props.obj, pathname(), isShare())
              }}
            >
              <IPlay size={16} />
            </button>
          </Show>
          <Show when={!props.obj.is_dir}>
            <button
              type="button"
              class="ol-icon-btn"
              title={t("home.toolbar.download")}
              aria-label={t("home.toolbar.download")}
              onClick={() => {
                window.open(rawLink(props.obj, true), "_blank")
              }}
            >
              <IDownload size={16} />
            </button>
          </Show>
          <button
            type="button"
            class="ol-icon-btn"
            title={t("home.toolbar.copy_link")}
            aria-label={t("home.toolbar.copy_link")}
            onClick={() => {
              const url = props.obj.is_dir
                ? previewPage(props.obj, true)
                : rawLink(props.obj, true)
              copy(url)
            }}
          >
            <ILink size={16} />
          </button>
          <button
            type="button"
            class="ol-icon-btn"
            title={t("home.toolbar.more")}
            aria-label={t("home.toolbar.more")}
            onClick={(e) => {
              batch(() => {
                selectIndex(props.index, true, true)
              })
              show(e, { props: props.obj })
            }}
          >
            <IMore size={16} />
          </button>
        </span>
      </span>

      <span class="ol-row__size size">
        {props.obj.is_dir ? "" : getFileSize(props.obj.size)}
      </span>
      <span class="ol-row__date modified">
        {formatDate(props.obj.modified)}
      </span>
    </div>
  )
}
