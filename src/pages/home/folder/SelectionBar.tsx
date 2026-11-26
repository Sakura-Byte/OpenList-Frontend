import { Show, createMemo } from "solid-js"
import {
  IArchive,
  ICopy,
  IDownload,
  IEdit,
  IFileMove,
  ILink,
  IShare,
  ITrash,
} from "~/components/icons-tb"
import { useCopyLink, useDownload, useRouter, useT } from "~/hooks"
import {
  allChecked,
  getSettingBool,
  me,
  objStore,
  oneChecked,
  selectAll,
  selectedObjs,
  userCan,
} from "~/store"
import { isArchive } from "~/store/archive"
import { UserMethods } from "~/types"
import { bus, getFileSize, notify } from "~/utils"

export const SelectionBar = () => {
  const t = useT()
  const { isShare } = useRouter()
  const { batchDownloadSelected } = useDownload()
  const { copySelectedRawLink, copySelectedPreviewPage } = useCopyLink()

  const selected = createMemo(() => selectedObjs())
  const selectedCount = () => selected().length
  const selectedSize = createMemo(() =>
    selected().reduce(
      (sum, item) => sum + (item.is_dir ? 0 : item.size || 0),
      0,
    ),
  )

  const hasFilesSelected = createMemo(() =>
    selected().some((item) => !item.is_dir),
  )
  const canPackageDownload = () =>
    UserMethods.is_admin(me()) || getSettingBool("package_download")

  const canWrite = () => !isShare() && Boolean(objStore.write)
  const canDecompress = createMemo(
    () =>
      canWrite() &&
      userCan("decompress") &&
      selected().length > 0 &&
      selected().every((o) => !o.is_dir && isArchive(o.name)),
  )

  const handleDownload = () => {
    if (hasFilesSelected()) {
      batchDownloadSelected()
      return
    }
    if (canPackageDownload()) {
      bus.emit("tool", "package_download")
    } else {
      notify.warning(t("home.toolbar.package_download_disabled"))
    }
  }

  const handleCopyLinks = () => {
    if (hasFilesSelected()) {
      copySelectedRawLink(true)
    } else {
      copySelectedPreviewPage()
    }
  }

  return (
    <div class="ol-selbar" role="region" aria-label={t("home.selbar.region")}>
      <input
        type="checkbox"
        class="ol-checkbox"
        aria-label={t("home.selbar.select_all")}
        checked={allChecked()}
        onChange={(e) => selectAll(e.currentTarget.checked)}
        style={{ "margin-right": "6px" }}
      />
      <span class="ol-selbar__count ol-tabular">
        {t("home.selbar.selected", { count: String(selectedCount()) })}
        <Show when={selectedSize() > 0}> · {getFileSize(selectedSize())}</Show>
      </span>
      <div class="ol-selbar__actions">
        <button type="button" class="ol-btn" onClick={handleDownload}>
          <IDownload size={14} />
          {t("home.toolbar.download")}
        </button>
        <button type="button" class="ol-btn" onClick={handleCopyLinks}>
          <ILink size={14} />
          {t("home.toolbar.copy_link")}
        </button>

        <Show when={!isShare() && userCan("share")}>
          <button
            type="button"
            class="ol-btn"
            onClick={() => bus.emit("tool", "share")}
          >
            <IShare size={14} />
            {t("home.toolbar.share")}
          </button>
        </Show>

        <Show when={canWrite() && oneChecked() && userCan("rename")}>
          <button
            type="button"
            class="ol-btn"
            onClick={() => bus.emit("tool", "rename")}
          >
            <IEdit size={14} />
            {t("home.toolbar.rename")}
          </button>
        </Show>

        <Show when={canWrite() && userCan("move")}>
          <button
            type="button"
            class="ol-btn"
            onClick={() => bus.emit("tool", "move")}
          >
            <IFileMove size={14} />
            {t("home.toolbar.move")}
          </button>
        </Show>

        <Show when={canWrite() && userCan("copy")}>
          <button
            type="button"
            class="ol-btn"
            onClick={() => bus.emit("tool", "copy")}
          >
            <ICopy size={14} />
            {t("home.toolbar.copy")}
          </button>
        </Show>

        <Show when={canDecompress()}>
          <button
            type="button"
            class="ol-btn"
            onClick={() => bus.emit("tool", "decompress")}
          >
            <IArchive size={14} />
            {t("home.toolbar.decompress")}
          </button>
        </Show>

        <Show when={canWrite() && userCan("delete")}>
          <button
            type="button"
            class="ol-btn ol-btn--danger"
            onClick={() => bus.emit("tool", "delete")}
          >
            <ITrash size={14} />
            {t("home.toolbar.delete")}
          </button>
        </Show>

        <button
          type="button"
          class="ol-btn ol-btn--ghost"
          onClick={() => selectAll(false)}
        >
          {t("global.cancel")}
        </button>
      </div>
    </div>
  )
}
