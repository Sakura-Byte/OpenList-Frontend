import { Show, createSignal, onCleanup } from "solid-js"
import { IDownload } from "~/components/icons-tb"
import { password } from "~/store"
import type { Resp } from "~/types"
import type { JMManifest } from "~/types/jmcomic"
import { r } from "~/utils"
import type { ExportFormat, ExportScope } from "./export"
import { useJMTranslation } from "./i18n"

export function ExportControls(props: { manifest: JMManifest }) {
  const t = useJMTranslation()
  const [format, setFormat] = createSignal<ExportFormat>("epub")
  const [scope, setScope] = createSignal<ExportScope>("chapter")
  const [busy, setBusy] = createSignal(false)
  const [status, setStatus] = createSignal("")
  const [error, setError] = createSignal("")
  let controller: AbortController | undefined
  onCleanup(() => controller?.abort())

  const run = async () => {
    if (busy()) return
    controller = new AbortController()
    const signal = controller.signal
    setBusy(true)
    setError("")
    setStatus(t("export_preparing"))
    try {
      const { exportComic, downloadExport } = await import("./export")
      const result = await exportComic({
        manifest: props.manifest,
        format: format(),
        scope: scope(),
        signal,
        loadChapter: async (path, signal) => {
          const response: Resp<JMManifest> = await r.post(
            "/fs/other",
            { path, password: password(), method: "jm_reader" },
            { signal },
          )
          if (response.code !== 200) throw new Error(response.message)
          return response.data
        },
        progress: (completed, total, chapter) =>
          setStatus(
            `${t("export_progress")} ${completed}/${total}${chapter ? " · " + chapter : ""}`,
          ),
      })
      signal.throwIfAborted()
      downloadExport(result.blob, result.filename)
      setStatus(t("export_done"))
    } catch (e) {
      if (signal.aborted) setStatus(t("export_cancelled"))
      else {
        setStatus("")
        const code = (e as { code?: string })?.code
        setError(
          code
            ? t(`export_error_${code}`)
            : `${t("export_failed")}: ${(e as Error)?.message ?? ""}`,
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div class="jm-export-controls">
      <div class="jm-export-row">
        <label class="jm-export-label">
          <span>{t("export_format")}</span>
          <select
            class="jm-export-select"
            aria-label={t("export_format")}
            value={format()}
            disabled={busy()}
            onChange={(e) => setFormat(e.currentTarget.value as ExportFormat)}
          >
            <option value="epub">EPUB</option>
            <option value="cbz">CBZ</option>
            <option value="pdf">PDF</option>
            <option value="zip">ZIP</option>
          </select>
        </label>
        <label class="jm-export-label">
          <span>{t("export_scope")}</span>
          <select
            class="jm-export-select"
            aria-label={t("export_scope")}
            value={scope()}
            disabled={busy()}
            onChange={(e) => setScope(e.currentTarget.value as ExportScope)}
          >
            <option value="chapter">{t("export_chapter")}</option>
            <option value="album">{t("export_album")}</option>
          </select>
        </label>
        <button
          type="button"
          class="ol-btn ol-btn--primary"
          onClick={run}
          disabled={busy() || !props.manifest.chapters.length}
        >
          <IDownload size={14} />
          {t("export_download")}
        </button>
        <Show when={busy()}>
          <button
            type="button"
            class="ol-btn"
            onClick={() => controller?.abort()}
          >
            {t("export_cancel")}
          </button>
        </Show>
      </div>
      <div class="jm-export-note">{t("export_policy")}</div>
      <Show when={scope() === "chapter"}>
        <div class="jm-export-note">
          {t("export_chapter")}:{" "}
          {props.manifest.chapters.find(
            (c) => c.id === props.manifest.chapter_id,
          )?.name ?? props.manifest.chapters[0]?.name}
        </div>
      </Show>
      <Show when={format() === "pdf"}>
        <div class="jm-export-note">{t("export_pdf_policy")}</div>
      </Show>
      <Show when={status()}>
        <div class="jm-export-note" role="status" aria-live="polite">
          {status()}
        </div>
      </Show>
      <Show when={error()}>
        <div
          class="jm-export-note"
          style={{ color: "var(--ol-danger)" }}
          role="alert"
        >
          {error()}
        </div>
      </Show>
    </div>
  )
}
