import { Checkbox, hope } from "@hope-ui/solid"
import SelectionArea from "@viselect/vanilla"
import { useContextMenu } from "solid-contextmenu"
import { createEffect, onCleanup } from "solid-js"
import {
  haveSelected,
  local,
  objStore,
  oneChecked,
  selectAll,
  selectIndex,
  selectedObjs,
} from "~/store"
import { StoreObj } from "~/types"
import { isMobile } from "~/utils/compatibility"

let selectedCache: StoreObj[] | null = null

export function useSelectWithMouse() {
  const isMouseSupported = () => !isMobile
  const openWithDoubleClick = () =>
    isMouseSupported() && local["open_item_on_checkbox"] === "dblclick"
  const toggleWithClick = () =>
    isMouseSupported() &&
    local["open_item_on_checkbox"] === "disable_while_checked" &&
    haveSelected()

  const saveSelectionCache = () => {
    selectedCache = selectedObjs()
  }

  const restoreSelectionCache = () => {
    if (selectedCache === null) return true
    for (let i = 0; i < objStore.objs.length; ++i) {
      selectIndex(i, selectedCache.indexOf(objStore.objs[i]) >= 0)
    }
    return true
  }

  const clearSelectionCache = () => {
    selectedCache = null
  }

  const registerSelectContainer = () => {
    createEffect(() => {
      if (!isMouseSupported()) {
        const area = document.querySelector(".viselect-container")
        area?.addEventListener("mousedown", saveSelectionCache)
        onCleanup(() =>
          area?.removeEventListener("mousedown", saveSelectionCache),
        )
        return
      }
      const selection = new SelectionArea({
        selectionAreaClass: "viselect-selection-area",
        startAreas: [".viselect-container"],
        boundaries: [".viselect-container"],
        selectables: [".viselect-item"],
      })
      selection.on("beforestart", ({ event }) => {
        const target = event?.target as Element | null
        if (
          target?.closest(
            "input, button, a, .ol-row__check, .ol-tile__check, .ol-row__actions, .ol-selbar, .ol-list__head",
          )
        ) {
          return false
        }
        saveSelectionCache()
        selection.clearSelection(true, true)
        selection.select(".viselect-item.selected", true)
      })
      selection.on("start", ({ event }) => {
        const ev = event as MouseEvent
        if (ev.type === "mousemove") {
          clearSelectionCache()
        }
        if (!ev.shiftKey && !ev.ctrlKey && !ev.metaKey) {
          selectAll(false)
          selection.clearSelection(true)
        }
      })
      selection.on(
        "move",
        ({
          store: {
            changed: { added, removed },
          },
        }) => {
          for (const el of added) {
            selectIndex(Number(el.getAttribute("data-index")), true)
          }
          for (const el of removed) {
            selectIndex(Number(el.getAttribute("data-index")), false)
          }
        },
      )
      onCleanup(() => selection.destroy())
    })
  }

  const { show } = useContextMenu({ id: 1 })

  const captureContentMenu = (e: MouseEvent) => {
    e.preventDefault()

    if (haveSelected() && !oneChecked()) {
      const $target = e.target as Element
      const $selectedItem = $target.closest(".viselect-item")
      const index = Number($selectedItem?.getAttribute("data-index"))

      const isClickOnContainer = Number.isNaN(index)
      const isClickOnSelectedItems = () => !!objStore.objs[index]?.selected
      if (isClickOnContainer || !isClickOnSelectedItems()) return

      e.stopPropagation()
      show(e, { props: objStore.obj })
    }
  }

  return {
    isMouseSupported,
    openWithDoubleClick,
    toggleWithClick,
    restoreSelectionCache,
    registerSelectContainer,
    captureContentMenu,
  }
}

export const ItemCheckbox = hope(Checkbox, {
  baseStyle: {
    _before: {
      content: "",
      pos: "absolute",
      top: -10,
      right: -2,
      bottom: -10,
      left: -10,
    },
  },
})
