import type { LightGallery } from "lightgallery/lightgallery"
import {
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  lazy,
  on,
  onCleanup,
} from "solid-js"
import { useLink } from "~/hooks"
import { haveSelected, layout, local, objStore } from "~/store"
import { ObjType } from "~/types"
import { bus } from "~/utils"
import { Pager } from "./Pager"
import { Search } from "./Search"
import { SelectionBar } from "./SelectionBar"
import { ContextMenu } from "./context-menu"
import { ASMRInlinePlayer, ASMRWorkView } from "../asmrone/ASMRWorkView"

const ListLayout = lazy(() => import("./List"))
const GridLayout = lazy(() => import("./Grid"))
const ImageLayout = lazy(() => import("./Images"))
const PosterLayout = lazy(() => import("./Poster"))
const TagFolders = lazy(() => import("../jmcomic/TagFolders"))

const Folder = () => {
  const { rawLink } = useLink()
  const images = createMemo(() =>
    objStore.objs.filter((obj) => obj.type === ObjType.IMAGE),
  )

  let dynamicGallery: LightGallery | undefined
  const initGallery = async () => {
    const [
      { default: lightGallery },
      { default: lgThumbnail },
      { default: lgZoom },
      { default: lgRotate },
      { default: lgAutoplay },
      { default: lgFullscreen },
    ] = await Promise.all([
      import("lightgallery"),
      import("lightgallery/plugins/thumbnail"),
      import("lightgallery/plugins/zoom"),
      import("lightgallery/plugins/rotate"),
      import("lightgallery/plugins/autoplay"),
      import("lightgallery/plugins/fullscreen"),
      import("lightgallery/css/lightgallery-bundle.css"),
    ])
    dynamicGallery = lightGallery(document.createElement("div"), {
      addClass: "lightgallery-container",
      dynamic: true,
      thumbnail: local["show_gallery_thumbnails"] === "visible",
      plugins: [lgZoom, lgThumbnail, lgRotate, lgAutoplay, lgFullscreen],
      dynamicEl: images().map((obj) => {
        const raw = rawLink(obj, true)
        return {
          src: raw,
          thumb: obj.thumb === "" ? raw : obj.thumb,
          subHtml: `<h4>${obj.name}</h4>`,
        }
      }),
    })
  }

  createEffect(
    on([images, () => local["show_gallery_thumbnails"]], () => {
      dynamicGallery?.destroy()
      dynamicGallery = undefined
    }),
  )

  const onGallery = async (name: string) => {
    if (!dynamicGallery) {
      await initGallery()
    }
    const idx = images().findIndex((obj) => obj.name === name)
    if (idx >= 0) {
      dynamicGallery?.openGallery(idx)
    }
  }

  bus.on("gallery", onGallery)
  onCleanup(() => {
    bus.off("gallery", onGallery)
    dynamicGallery?.destroy()
  })

  return (
    <>
      <ASMRWorkView />
      <ASMRInlinePlayer />
      <Show when={haveSelected() && layout() !== "list" && layout() !== "grid"}>
        <SelectionBar />
      </Show>
      <Switch>
        <Match when={objStore.objs.some((obj) => !!obj.tag)}>
          <TagFolders />
        </Match>
        <Match when={layout() === "list"}>
          <ListLayout />
        </Match>
        <Match when={layout() === "grid"}>
          <GridLayout />
        </Match>
        <Match when={layout() === "image"}>
          <ImageLayout images={images()} />
        </Match>
        <Match when={layout() === "poster"}>
          <PosterLayout />
        </Match>
      </Switch>
      <Pager />
      <Search />
      <ContextMenu />
    </>
  )
}

export default Folder
