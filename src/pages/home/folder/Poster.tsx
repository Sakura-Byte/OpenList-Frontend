import { Box, Text } from "@hope-ui/solid"
import { For, Show } from "solid-js"
import { PosterItem } from "./PosterItem"
import { smartCountMsg, local, objStore } from "~/store"
import { useSelectWithMouse } from "./helper"
import "./poster.css"

const PosterLayout = () => {
  const { registerSelectContainer, captureContentMenu } = useSelectWithMouse()
  registerSelectContainer()
  return (
    <>
      <Show when={local["show_count_msg"] === "visible"}>
        <Box w="100%" textAlign="left" pl="$2">
          <Text size="sm" color="$neutral11">
            {smartCountMsg()}
          </Text>
        </Box>
      </Show>
      <div
        oncapture:contextmenu={captureContentMenu}
        class="viselect-container poster-grid"
        style={{
          "--poster-min": `${parseInt(local["poster_item_size"]) || 160}px`,
        }}
      >
        <For each={objStore.objs}>
          {(obj, i) => <PosterItem obj={obj} index={i()} />}
        </For>
      </div>
    </>
  )
}

export default PosterLayout
