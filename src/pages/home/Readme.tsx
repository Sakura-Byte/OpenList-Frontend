import { Show, createEffect, createMemo, createSignal, on } from "solid-js"
import { Markdown } from "~/components"
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
  const [displayedContent, setDisplayedContent] = createSignal<
    string | ArrayBuffer
  >("")
  let fetchSeq = 0

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

  const resolvedSource = createMemo(
    on(
      () =>
        [
          objStore.state,
          objStore.reader,
          objStore[props.fromMeta],
          searchParams.view,
        ] as const,
      (): { settled: boolean; src: string } => {
        // Keep previous DOM visible during in-flight folder transitions (zero blink!)
        if (
          [State.FetchingObj, State.FetchingObjs, State.Initial].includes(
            objStore.state,
          )
        ) {
          return { settled: false, src: "" }
        }
        if (
          ![State.FetchingMore, State.Folder, State.File].includes(
            objStore.state,
          )
        ) {
          return { settled: true, src: "" }
        }
        if (
          [State.FetchingMore, State.Folder].includes(objStore.state) &&
          !(objStore.reader && searchParams.view !== "files")
        ) {
          // On ASMR.ONE work directories, ASMRWorkView handles synthesized README.md via toggle
          if (objStore.provider !== "ASMR.ONE") {
            const obj = objStore.objs.find((item) =>
              props.files.find(
                (file) => file.toLowerCase() === item.name.toLowerCase(),
              ),
            )
            if (obj) {
              return { settled: true, src: proxyLink(obj, true) }
            }
          }
        }
        const metaVal = objStore[props.fromMeta]
        if (metaVal && typeof metaVal === "string") {
          return { settled: true, src: metaVal.trim() }
        }
        return { settled: true, src: "" }
      },
    ),
  )

  createEffect(
    on(resolvedSource, async ({ settled, src }) => {
      if (!settled) return
      const mySeq = ++fetchSeq
      if (!src) {
        setDisplayedContent("")
        return
      }
      if (/^https?:\/\//i.test(src)) {
        const res = await fetchText(src)
        if (mySeq !== fetchSeq) return
        setDisplayedContent(() => res.content)
      } else {
        setDisplayedContent(src)
      }
    }),
  )

  const hasVisibleContent = createMemo(() => {
    const c = displayedContent()
    if (typeof c === "string") return c.length > 0
    return Boolean(c && c.byteLength > 0)
  })

  return (
    <Show when={getSettingBool("readme_autorender") && hasVisibleContent()}>
      <section class="ol-sheet ol-readme">
        <div class="ol-nav-body">
          <Markdown
            children={displayedContent()}
            readme
            toc={props.fromMeta === "readme"}
            trackContent
            contentName={trackingMeta().name}
            contentPiece={trackingMeta().piece}
          />
        </div>
      </section>
    </Show>
  )
}
