import { For, Show, createMemo } from "solid-js"
import { useT, useUtil } from "~/hooks"
import { checkboxOpen, haveSelected, local, objStore } from "~/store"
import { GridItem } from "./GridItem"
import { SelectionBar } from "./SelectionBar"
import { useSelectWithMouse } from "./helper"

const GridLayout = () => {
  const t = useT()
  const { isHide } = useUtil()
  const { registerSelectContainer, captureContentMenu } = useSelectWithMouse()
  registerSelectContainer()

  const visibleCount = createMemo(
    () => objStore.objs.filter((o) => !isHide(o)).length,
  )

  const minTileWidth = () =>
    Math.max(120, (parseInt(local["grid_item_size"]) || 90) + 32)

  return (
    <div>
      <Show when={haveSelected()}>
        <SelectionBar />
      </Show>
      <Show
        when={visibleCount() > 0}
        fallback={<div class="ol-empty">{t("home.empty_dir")}</div>}
      >
        <div
          oncapture:contextmenu={captureContentMenu}
          class="ol-grid ol-nav-body viselect-container"
          data-selecting={haveSelected() || checkboxOpen()}
          style={{
            "grid-template-columns": `repeat(auto-fill, minmax(${minTileWidth()}px, 1fr))`,
          }}
        >
          <For each={objStore.objs}>
            {(obj, i) => <GridItem obj={obj} index={i()} />}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default GridLayout
