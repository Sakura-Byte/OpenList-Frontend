import { Button, HStack, Text, VStack } from "@hope-ui/solid"
import { createSignal, onCleanup, Show } from "solid-js"
import { password } from "~/store"
import { r } from "~/utils"
import type { Resp } from "~/types"
import type { JMManifest } from "~/types/jmcomic"
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
    <VStack
      class="jm-export-controls"
      alignItems="start"
      spacing="$2"
      w="$full"
    >
      <HStack flexWrap="wrap" gap="$2">
        <label>
          {t("export_format")}{" "}
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
        <label>
          {t("export_scope")}{" "}
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
        <Button
          onClick={run}
          disabled={busy() || !props.manifest.chapters.length}
        >
          {t("export_download")}
        </Button>
        <Show when={busy()}>
          <Button onClick={() => controller?.abort()}>
            {t("export_cancel")}
          </Button>
        </Show>
      </HStack>
      <Text size="sm">{t("export_policy")}</Text>
      <Show when={scope() === "chapter"}>
        <Text size="sm">
          {t("export_chapter")}:{" "}
          {props.manifest.chapters.find(
            (c) => c.id === props.manifest.chapter_id,
          )?.name ?? props.manifest.chapters[0]?.name}
        </Text>
      </Show>
      <Show when={format() === "pdf"}>
        <Text size="sm">{t("export_pdf_policy")}</Text>
      </Show>
      <Show when={status()}>
        <Text role="status" aria-live="polite">
          {status()}
        </Text>
      </Show>
      <Show when={error()}>
        <Text role="alert">{error()}</Text>
      </Show>
    </VStack>
  )
}
