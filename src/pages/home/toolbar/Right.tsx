import { Show, createMemo, createSignal } from "solid-js"
import {
  IClose,
  IFilePlus,
  IFolderMinus,
  IFolderPlus,
  IFolderUp,
  IList,
  IMagnet,
  IMore,
  IRefresh,
  IReplace,
  ISettings,
  IUpload,
} from "~/components/icons-tb"
import { isTocVisible, setTocDisabled } from "~/components"
import { usePath, useRouter, useT } from "~/hooks"
import { State, objStore, selectAll, userCan } from "~/store"
import { bus } from "~/utils"

export const Right = () => {
  const t = useT()
  const { refresh } = usePath()
  const { isShare } = useRouter()
  const [open, setOpen] = createSignal(false)

  const isFolder = createMemo(() => objStore.state === State.Folder)
  const canWriteContent = createMemo(
    () =>
      isFolder() &&
      !isShare() &&
      (userCan("write_content") || objStore.write_content_bypass) &&
      Boolean(objStore.write),
  )

  const runAction = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <>
      <Show when={open()}>
        <div class="ol-fab-menu" role="menu">
          <Show when={canWriteContent()}>
            <button
              type="button"
              class="ol-fab-item"
              onClick={() => runAction(() => refresh(undefined, true))}
            >
              <IRefresh size={16} />
              <span>{t("home.toolbar.refresh")}</span>
            </button>
            <button
              type="button"
              class="ol-fab-item"
              onClick={() => runAction(() => bus.emit("tool", "upload"))}
            >
              <IUpload size={16} />
              <span>{t("home.toolbar.upload")}</span>
            </button>
            <button
              type="button"
              class="ol-fab-item"
              onClick={() => runAction(() => bus.emit("tool", "mkdir"))}
            >
              <IFolderPlus size={16} />
              <span>{t("home.toolbar.mkdir")}</span>
            </button>
            <button
              type="button"
              class="ol-fab-item"
              onClick={() => runAction(() => bus.emit("tool", "new_file"))}
            >
              <IFilePlus size={16} />
              <span>{t("home.toolbar.new_file")}</span>
            </button>
          </Show>

          <Show
            when={
              isFolder() &&
              !isShare() &&
              userCan("offline_download") &&
              Boolean(objStore.write)
            }
          >
            <button
              type="button"
              class="ol-fab-item"
              onClick={() =>
                runAction(() => bus.emit("tool", "offline_download"))
              }
            >
              <IMagnet size={16} />
              <span>{t("home.toolbar.offline_download")}</span>
            </button>
          </Show>

          <Show
            when={
              isFolder() &&
              !isShare() &&
              userCan("rename") &&
              Boolean(objStore.write)
            }
          >
            <button
              type="button"
              class="ol-fab-item"
              onClick={() =>
                runAction(() => {
                  selectAll(true)
                  bus.emit("tool", "batchRename")
                })
              }
            >
              <IReplace size={16} />
              <span>{t("home.toolbar.batch_rename")}</span>
            </button>
          </Show>

          <Show
            when={
              isFolder() &&
              !isShare() &&
              userCan("move") &&
              Boolean(objStore.write)
            }
          >
            <button
              type="button"
              class="ol-fab-item"
              onClick={() => runAction(() => bus.emit("tool", "recursiveMove"))}
            >
              <IFolderUp size={16} />
              <span>{t("home.toolbar.recursive_move")}</span>
            </button>
          </Show>

          <Show
            when={
              isFolder() &&
              !isShare() &&
              userCan("delete") &&
              Boolean(objStore.write)
            }
          >
            <button
              type="button"
              class="ol-fab-item"
              onClick={() =>
                runAction(() => bus.emit("tool", "removeEmptyDirectory"))
              }
            >
              <IFolderMinus size={16} />
              <span>{t("home.toolbar.remove_empty_directory")}</span>
            </button>
          </Show>

          <Show when={isTocVisible()}>
            <button
              type="button"
              class="ol-fab-item"
              onClick={() => runAction(() => setTocDisabled((d) => !d))}
            >
              <IList size={16} />
              <span>{t("home.toolbar.toggle_markdown_toc")}</span>
            </button>
          </Show>

          <button
            type="button"
            class="ol-fab-item"
            onClick={() => runAction(() => bus.emit("tool", "local_settings"))}
          >
            <ISettings size={16} />
            <span>{t("home.toolbar.local_settings")}</span>
          </button>
        </div>
      </Show>

      <button
        type="button"
        class="ol-fab-btn toolbar-toggle"
        title={t("home.toolbar.more")}
        aria-label={t("home.toolbar.more")}
        aria-expanded={open()}
        onClick={() => setOpen((v) => !v)}
      >
        {open() ? <IClose size={18} /> : <IMore size={18} />}
      </button>
    </>
  )
}
