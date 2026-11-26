import { For, Show, createMemo } from "solid-js"
import { useT, useUtil } from "~/hooks"
import { checkboxOpen, haveSelected, local, objStore } from "~/store"
import { PosterItem } from "./PosterItem"
import { useSelectWithMouse } from "./helper"
import "./poster.css"

const PosterLayout = () => {
  const t = useT()
  const { isHide } = useUtil()
  const { registerSelectContainer, captureContentMenu } = useSelectWithMouse()
  registerSelectContainer()

  const visibleCount = createMemo(
    () => objStore.objs.filter((o) => !isHide(o)).length,
  )

  return (
    <Show
      when={visibleCount() > 0}
      fallback={<div class="ol-empty">{t("home.empty_dir")}</div>}
    >
      <div
        oncapture:contextmenu={captureContentMenu}
        class="ol-posters poster-grid ol-nav-body viselect-container"
        data-selecting={haveSelected() || checkboxOpen()}
        style={{
          "--poster-min": `${parseInt(local["poster_item_size"]) || 156}px`,
        }}
      >
        <For each={objStore.objs}>
          {(obj, i) => <PosterItem obj={obj} index={i()} />}
        </For>
      </div>
    </Show>
  )
}

export default PosterLayout
