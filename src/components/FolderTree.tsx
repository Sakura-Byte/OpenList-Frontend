import { Button, HStack, Input } from "@hope-ui/solid"
import { TbCheck, TbChevronRight, TbX } from "solid-icons/tb"
import {
  Accessor,
  For,
  JSXElement,
  Setter,
  Show,
  createContext,
  createEffect,
  createSignal,
  on,
  onMount,
  useContext,
} from "solid-js"
import { FolderGlyph } from "~/components/icons-tb"
import { OlDialog } from "~/components/ui"
import { useFetch, useT, useUtil } from "~/hooks"
import { password } from "~/store"
import { Obj } from "~/types"
import {
  createMatcher,
  fsDirs,
  fsMkdir,
  handleResp,
  handleRespWithNotifySuccess,
  notify,
  pathBase,
  pathJoin,
  validateFilename,
} from "~/utils"

export type FolderTreeHandler = {
  setPath: Setter<string>
  startCreateFolder: () => void
}

export interface FolderTreeProps {
  onChange: (path: string) => void
  forceRoot?: boolean
  autoOpen?: boolean
  handle?: (handler: FolderTreeHandler) => void
  showEmptyIcon?: boolean
  showHiddenFolder?: boolean
}

interface FolderTreeContext extends Omit<FolderTreeProps, "handle"> {
  value: Accessor<string>
  creatingFolderPath: Accessor<string | null>
  setCreatingFolderPath: Setter<string | null>
}

const context = createContext<FolderTreeContext>()

export const FolderTree = (props: FolderTreeProps) => {
  const [path, setPath] = createSignal("/")
  const [creatingFolderPath, setCreatingFolderPath] = createSignal<
    string | null
  >(null)

  const startCreateFolder = () => {
    setCreatingFolderPath(path())
  }

  props.handle?.({
    setPath,
    startCreateFolder,
  })

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
          creatingFolderPath,
          setCreatingFolderPath,
        }}
      >
        <FolderTreeNode path="/" />
      </context.Provider>
    </div>
  )
}

const FolderTreeNode = (props: { path: string }) => {
  const { isHidePath } = useUtil()
  const [children, setChildren] = createSignal<Obj[]>()
  const [isOpen, setIsOpen] = createSignal(false)
  const {
    value,
    onChange,
    forceRoot,
    autoOpen,
    showEmptyIcon,
    showHiddenFolder,
    creatingFolderPath,
    setCreatingFolderPath,
  } = useContext(context)!

  const emptyIconVisible = () =>
    Boolean(showEmptyIcon && children() !== undefined && !children()?.length)
  const [loading, fetchDirs] = useFetch(() =>
    fsDirs(props.path, password(), forceRoot),
  )

  let isLoaded = false
  const load = async (force = false) => {
    if (!force && children()?.length) return
    const resp = await fetchDirs()
    handleResp(
      resp,
      (data) => {
        isLoaded = true
        setChildren(data)
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

  createEffect(() => {
    if (creatingFolderPath() === props.path) {
      if (!isOpen()) setIsOpen(true)
      if (!isLoaded) load()
    }
  })

  const isHiddenFolder = () =>
    isHidePath(props.path) && !isMatchedFolder(value())

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
            <For each={children()}>
              {(item) => (
                <FolderTreeNode path={pathJoin(props.path, item.name)} />
              )}
            </For>
            <Show when={creatingFolderPath() === props.path}>
              <FolderNameInput
                parentPath={props.path}
                onCancel={() => setCreatingFolderPath(null)}
                onSuccess={(fullPath) => {
                  setCreatingFolderPath(null)
                  onChange(fullPath)
                  load(true)
                }}
              />
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  )
}

const FolderNameInput = (props: {
  parentPath: string
  onCancel: () => void
  onSuccess: (fullPath: string) => void
}) => {
  const t = useT()
  const [folderName, setFolderName] = createSignal("")
  const [loading, mkdir] = useFetch(fsMkdir)

  const handleSubmit = async () => {
    const name = folderName().trim()
    if (!name || loading()) return

    const validation = validateFilename(name)
    if (!validation.valid) {
      notify.warning(t(`global.${validation.error}`))
      return
    }

    const fullPath = pathJoin(props.parentPath, name)
    const resp = await mkdir(fullPath)
    handleRespWithNotifySuccess(
      resp,
      () => props.onSuccess(fullPath),
      () => props.onCancel(),
    )
  }

  let inputRef: HTMLInputElement | undefined

  onMount(() => {
    window.setTimeout(() => {
      inputRef?.focus()
      inputRef?.select()
    }, 0)
  })

  return (
    <div class="ol-ftree__mkdir">
      <FolderGlyph size={17} />
      <input
        ref={(el) => (inputRef = el)}
        class="ol-ui-input ol-ui-input--sm"
        style={{ flex: 1 }}
        value={folderName()}
        onInput={(e) => setFolderName(e.currentTarget.value)}
        placeholder={t("home.toolbar.input_dir_name")}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            handleSubmit()
          } else if (e.key === "Escape") {
            props.onCancel()
          }
        }}
        onBlur={(e) => {
          if (loading()) return
          const next = e.relatedTarget as HTMLElement | null
          if (next?.dataset.folderAction === "true") return
          if (!folderName().trim()) {
            props.onCancel()
          }
        }}
      />
      <Show
        when={!loading()}
        fallback={<span class="ol-ui-spinner" aria-hidden="true" />}
      >
        <button
          type="button"
          class="ol-icon-btn"
          aria-label={t("global.ok")}
          onClick={handleSubmit}
          data-folder-action="true"
        >
          <TbCheck size={16} class="ol-ico" />
        </button>
      </Show>
      <button
        type="button"
        class="ol-icon-btn"
        aria-label={t("global.cancel")}
        onClick={props.onCancel}
        data-folder-action="true"
      >
        <TbX size={16} class="ol-ico" />
      </button>
    </div>
  )
}

export type ModalFolderChooseProps = {
  opened: boolean
  onClose: () => void
  onSubmit?: (text: string) => void
  type?: string
  defaultValue?: string | (() => string)
  loading?: boolean
  footerSlot?: JSXElement
  headerSlot?: (handler: FolderTreeHandler | undefined) => JSXElement
  children?: JSXElement
  header: string
}

export const ModalFolderChoose = (props: ModalFolderChooseProps) => {
  const t = useT()
  const [value, setValue] = createSignal("/")
  const [handler, setHandler] = createSignal<FolderTreeHandler>()

  createEffect(() => {
    if (!props.opened) return
    handler()?.setPath(value())
  })

  if (typeof props.defaultValue === "function") {
    createEffect(() => {
      setValue((props.defaultValue as () => string)())
    })
  } else if (typeof props.defaultValue === "string") {
    setValue(props.defaultValue)
  }

  return (
    <OlDialog
      open={props.opened}
      onClose={props.onClose}
      size="lg"
      title={props.header}
      headerExtra={
        <Show when={props.headerSlot && handler()}>
          {props.headerSlot!(handler()!)}
        </Show>
      }
      footer={
        <>
          <Show when={props.footerSlot}>
            <div style={{ "margin-right": "auto" }}>{props.footerSlot}</div>
          </Show>
          <button type="button" class="ol-btn" onClick={props.onClose}>
            {t("global.cancel")}
          </button>
          <button
            type="button"
            class="ol-btn ol-btn--primary"
            disabled={props.loading}
            onClick={() => props.onSubmit?.(value())}
          >
            <Show when={props.loading}>
              <span class="ol-ui-spinner" aria-hidden="true" />
            </Show>
            {t("global.ok")}
          </button>
        </>
      }
    >
      {props.children}
      <FolderTree onChange={setValue} handle={(h) => setHandler(h)} autoOpen />
    </OlDialog>
  )
}

export const FolderChooseInput = (props: {
  value: string
  onChange: (path: string) => void
  id?: string
  onlyFolder?: boolean
}) => {
  const [open, setOpen] = createSignal(false)
  const t = useT()
  return (
    <>
      <HStack w="$full" spacing="$2">
        <Input
          id={props.id}
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          readOnly={props.onlyFolder}
          onClick={props.onlyFolder ? () => setOpen(true) : undefined}
          placeholder={t(
            `global.${
              props.onlyFolder ? "choose_folder" : "choose_or_input_path"
            }`,
          )}
        />
        <Show when={!props.onlyFolder}>
          <Button onClick={() => setOpen(true)}>{t("global.choose")}</Button>
        </Show>
      </HStack>
      <OlDialog
        open={open()}
        onClose={() => setOpen(false)}
        size="lg"
        showCloseButton
        title={t("global.choose_folder")}
        footer={
          <button
            type="button"
            class="ol-btn ol-btn--primary"
            onClick={() => setOpen(false)}
          >
            {t("global.confirm")}
          </button>
        }
      >
        <FolderTree forceRoot onChange={props.onChange} />
      </OlDialog>
    </>
  )
}
