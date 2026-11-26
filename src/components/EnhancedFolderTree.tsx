import { TbChevronRight } from "solid-icons/tb"
import {
  Accessor,
  For,
  Setter,
  Show,
  createContext,
  createEffect,
  createSignal,
  on,
  useContext,
} from "solid-js"
import { FileIcon, FolderGlyph, fileKind } from "~/components/icons-tb"
import "~/components/ui/ui.css"
import { useFetch, useUtil } from "~/hooks"
import { password } from "~/store"
import { Obj } from "~/types"
import { createMatcher, handleResp, pathBase, pathJoin } from "~/utils"
import { fsList } from "~/utils/api"

export type EnhancedFolderTreeHandler = {
  setPath: Setter<string>
}

export interface EnhancedFolderTreeProps {
  onChange: (path: string) => void
  forceRoot?: boolean
  autoOpen?: boolean
  handle?: (handler: EnhancedFolderTreeHandler) => void
  showEmptyIcon?: boolean
  showHiddenFolder?: boolean
}

interface EnhancedFolderTreeContext extends Omit<
  EnhancedFolderTreeProps,
  "handle"
> {
  value: Accessor<string>
}

const context = createContext<EnhancedFolderTreeContext>()

export const EnhancedFolderTree = (props: EnhancedFolderTreeProps) => {
  const [path, setPath] = createSignal("/")
  props.handle?.({ setPath })
  return (
    <div class="folder-tree-box ol-modern-scope ol-ftree">
      <context.Provider
        value={{
          value: path,
          onChange: (val) => {
            setPath(val)
            props.onChange(val)
          },
          autoOpen: props.autoOpen ?? false,
          forceRoot: props.forceRoot ?? false,
          showEmptyIcon: props.showEmptyIcon ?? false,
          showHiddenFolder: props.showHiddenFolder ?? true,
        }}
      >
        <EnhancedFolderTreeNode path="/" />
      </context.Provider>
    </div>
  )
}

const EnhancedFolderTreeNode = (props: { path: string }) => {
  const { isHidePath } = useUtil()
  const [items, setItems] = createSignal<Obj[]>()
  const [isOpen, setIsOpen] = createSignal(false)
  const { value, onChange, autoOpen, showEmptyIcon, showHiddenFolder } =
    useContext(context)!

  const emptyIconVisible = () =>
    Boolean(showEmptyIcon && items() !== undefined && !items()?.length)

  const [loading, fetchItems] = useFetch(() =>
    fsList(props.path, password(), 1, 0, false),
  )

  let isLoaded = false

  const load = async () => {
    if (items()?.length) return
    const resp = await fetchItems()
    handleResp(
      resp,
      (data) => {
        isLoaded = true
        setItems(data.content || [])
      },
      () => {
        if (isOpen()) setIsOpen(false)
      },
    )
  }

  const active = () => value() === props.path
  const isMatchedFolder = createMatcher(props.path)

  const checkIfShouldOpen = async (pathname: string) => {
    if (!autoOpen) return
    if (isMatchedFolder(pathname)) {
      if (!isOpen()) setIsOpen(true)
      if (!isLoaded) load()
    }
  }

  createEffect(on(value, checkIfShouldOpen))

  const isHiddenFolder = () =>
    isHidePath(props.path) && !isMatchedFolder(value())

  const folders = () => items()?.filter((item) => item.is_dir) || []
  const files = () => items()?.filter((item) => !item.is_dir) || []

  return (
    <Show when={showHiddenFolder || !isHiddenFolder()}>
      <div>
        <div
          class="ol-ftree__row"
          data-active={active()}
          onClick={() => onChange(props.path)}
        >
          <Show
            when={!loading()}
            fallback={<span class="ol-ui-spinner" aria-hidden="true" />}
          >
            <Show
              when={!emptyIconVisible()}
              fallback={<span style={{ width: "22px", flex: "none" }} />}
            >
              <button
                type="button"
                class="ol-ftree__toggle"
                aria-label={isOpen() ? "Collapse" : "Expand"}
                onClick={(e) => {
                  e.stopPropagation()
                  const next = !isOpen()
                  setIsOpen(next)
                  if (next) load()
                }}
              >
                <TbChevronRight
                  size={15}
                  class="ol-ico ol-ftree__chevron"
                  data-open={isOpen()}
                />
              </button>
            </Show>
          </Show>
          <FolderGlyph size={18} />
          <span class="ol-ftree__label">
            {props.path === "/" ? "root" : pathBase(props.path)}
          </span>
        </div>

        <Show when={isOpen()}>
          <div class="ol-ftree__children">
            <For each={folders()}>
              {(item) => (
                <EnhancedFolderTreeNode
                  path={pathJoin(props.path, item.name)}
                />
              )}
            </For>

            <For each={files()}>
              {(item) => {
                const fullPath = pathJoin(props.path, item.name)
                return (
                  <div
                    class="ol-ftree__row"
                    data-active={value() === fullPath}
                    onClick={() => onChange(fullPath)}
                  >
                    <span style={{ width: "22px", flex: "none" }} />
                    <FileIcon
                      kind={fileKind(item.name, false, item.type)}
                      size={17}
                    />
                    <span class="ol-ftree__label">{item.name}</span>
                  </div>
                )
              }}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  )
}
