import { Show, createMemo, createResource, on } from "solid-js"
import { Markdown, MaybeLoading } from "~/components"
import { useLink, useRouter } from "~/hooks"
import { State, getSettingBool, objStore } from "~/store"
import { fetchText } from "~/utils"

export function hasActiveReadmeForCurrentView(files: string[]) {
  const { searchParams } = useRouter()
  return createMemo(() => {
    if (!getSettingBool("readme_autorender")) return false
    if (
      ![State.FetchingMore, State.Folder, State.File].includes(objStore.state)
    ) {
      return false
    }
    if (
      [State.FetchingMore, State.Folder].includes(objStore.state) &&
      !(objStore.reader && searchParams.view !== "files")
    ) {
      const found = objStore.objs.find((item) =>
        files.some((file) => file.toLowerCase() === item.name.toLowerCase()),
      )
      if (found) return true
    }
    return Boolean(objStore.readme && objStore.readme.trim())
  })
}

export function Readme(props: {
  files: string[]
  fromMeta: keyof typeof objStore
}) {
  const { proxyLink } = useLink()
  const { searchParams } = useRouter()
  const trackingMeta = createMemo(() =>
    props.fromMeta === "header"
      ? {
          name: "Home Top Description",
          piece: "home-top-description",
        }
      : {
          name: "Home Readme",
          piece: "home-readme",
        },
  )

  const readme = createMemo(
    on(
      () =>
        [
          objStore.state,
          objStore.reader,
          objStore[props.fromMeta],
          searchParams.view,
        ] as const,
      () => {
        if (
          ![State.FetchingMore, State.Folder, State.File].includes(
            objStore.state,
          )
        ) {
          return ""
        }
        if (
          [State.FetchingMore, State.Folder].includes(objStore.state) &&
          !(objStore.reader && searchParams.view !== "files")
        ) {
          const obj = objStore.objs.find((item) =>
            props.files.find(
              (file) => file.toLowerCase() === item.name.toLowerCase(),
            ),
          )
          if (obj) {
            return proxyLink(obj, true)
          }
        }
        const metaVal = objStore[props.fromMeta]
        if (metaVal && typeof metaVal === "string") {
          return metaVal.trim()
        }
        return ""
      },
    ),
  )

  const fetchContent = async (src: string) => {
    if (!src) return { content: "" as string | ArrayBuffer }
    if (/^https?:\/\//i.test(src)) {
      return await fetchText(src)
    }
    return {
      content: src as string | ArrayBuffer,
    }
  }
  const [content] = createResource(readme, fetchContent)

  return (
    <Show when={getSettingBool("readme_autorender") && readme()}>
      <section class="ol-sheet ol-readme">
        <div class="ol-nav-body">
          <MaybeLoading loading={content.loading}>
            <Markdown
              children={content()?.content}
              readme
              toc={props.fromMeta === "readme"}
              trackContent
              contentName={trackingMeta().name}
              contentPiece={trackingMeta().piece}
            />
          </MaybeLoading>
        </div>
      </section>
    </Show>
  )
}
