import { Show, createMemo } from "solid-js"
import { IGrid, IImage, IList, IPoster } from "~/components/icons-tb"
import { useT } from "~/hooks"
import { LayoutType, isPosterProvider, layout, setLayout } from "~/store"

export const Layout = () => {
  const t = useT()
  const showPoster = createMemo(
    () => isPosterProvider() || layout() === "poster",
  )
  const showImage = createMemo(() => layout() === "image")

  const choose = (mode: LayoutType) => {
    setLayout(mode)
  }

  return (
    <div class="ol-seg" role="group" aria-label={t("home.layouts.switch")}>
      <button
        type="button"
        class="ol-seg__btn"
        title={t("home.layouts.list")}
        aria-label={t("home.layouts.list")}
        aria-pressed={layout() === "list"}
        onClick={() => choose("list")}
      >
        <IList size={15} />
      </button>
      <button
        type="button"
        class="ol-seg__btn"
        title={t("home.layouts.grid")}
        aria-label={t("home.layouts.grid")}
        aria-pressed={layout() === "grid"}
        onClick={() => choose("grid")}
      >
        <IGrid size={15} />
      </button>
      <Show when={showImage()}>
        <button
          type="button"
          class="ol-seg__btn"
          title={t("home.layouts.image")}
          aria-label={t("home.layouts.image")}
          aria-pressed={layout() === "image"}
          onClick={() => choose("image")}
        >
          <IImage size={15} />
        </button>
      </Show>
      <Show when={showPoster()}>
        <button
          type="button"
          class="ol-seg__btn"
          title={t("home.layouts.poster")}
          aria-label={t("home.layouts.poster")}
          aria-pressed={layout() === "poster"}
          onClick={() => choose("poster")}
        >
          <IPoster size={15} />
        </button>
      </Show>
    </div>
  )
}
