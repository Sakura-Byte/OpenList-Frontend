import type { JMManifest, JMPage } from "~/types/jmcomic"
import { restoreMoves } from "./restore"

export type ExportFormat = "epub" | "cbz" | "pdf" | "zip"
export type ExportScope = "chapter" | "album"
export type ExportErrorCode =
  | "cors"
  | "image"
  | "limit"
  | "empty"
  | "mode_changed"
export class ComicExportError extends Error {
  constructor(
    public code: ExportErrorCode,
    message: string = code,
  ) {
    super(message)
  }
}
const MiB = 1024 * 1024
const xml = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
export const exportName = (name: string) =>
  name
    .replace(/[\x00-\x1f<>:"/\\|?*]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 120) || "JMComic"
const check = (signal: AbortSignal) => signal.throwIfAborted()

async function limitedBlob(
  response: Response,
  signal: AbortSignal,
): Promise<Blob> {
  if (!response.ok)
    throw new ComicExportError("image", `HTTP ${response.status}`)
  if (Number(response.headers.get("content-length")) > 16 * MiB)
    throw new ComicExportError("limit")
  const reader = response.body?.getReader()
  if (!reader) throw new ComicExportError("image")
  const chunks: ArrayBuffer[] = []
  let size = 0
  try {
    for (;;) {
      check(signal)
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 16 * MiB) throw new ComicExportError("limit")
      chunks.push(value.slice().buffer)
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  return new Blob(chunks, {
    type: response.headers.get("content-type") ?? "application/octet-stream",
  })
}

export async function exportImage(
  page: JMPage,
  mode: JMManifest["mode"],
  format: ExportFormat,
  signal: AbortSignal,
) {
  check(signal)
  let response: Response
  try {
    response = await fetch(page.url, {
      signal,
      credentials: "omit",
      mode: "cors",
      referrerPolicy: "no-referrer",
    })
  } catch (error) {
    check(signal)
    if (mode === "client") throw new ComicExportError("cors")
    throw error
  }
  const input = await limitedBlob(response, signal)
  check(signal)
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(input)
  } catch {
    throw new ComicExportError("image")
  }
  const canvas = document.createElement("canvas")
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 16000000 ||
      bitmap.width > 16000 ||
      bitmap.height > 16000
    )
      throw new ComicExportError("limit")
    const width = bitmap.width,
      height = bitmap.height
    if (page.gif && format !== "pdf") {
      const signature = new TextDecoder().decode(
        await input.slice(0, 6).arrayBuffer(),
      )
      if (signature !== "GIF87a" && signature !== "GIF89a")
        throw new ComicExportError("image")
      return {
        blob: input,
        width,
        height,
        extension: "gif",
        mediaType: "image/gif",
      }
    }
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new ComicExportError("image")
    for (const move of restoreMoves(
      height,
      mode === "client" && !page.gif ? page.segments : 0,
    )) {
      check(signal)
      if (move.height)
        context.drawImage(
          bitmap,
          0,
          move.source,
          width,
          move.height,
          0,
          move.target,
          width,
          move.height,
        )
    }
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new ComicExportError("image"))),
        "image/png",
      ),
    )
    check(signal)
    if (blob.size > 32 * MiB) throw new ComicExportError("limit")
    return { blob, width, height, extension: "png", mediaType: "image/png" }
  } finally {
    bitmap.close()
    canvas.width = 1
    canvas.height = 1
  }
}

interface ExportOptions {
  manifest: JMManifest
  format: ExportFormat
  scope: ExportScope
  signal: AbortSignal
  loadChapter: (path: string, signal: AbortSignal) => Promise<JMManifest>
  progress: (completed: number, total: number, chapter: string) => void
}

// Image requests are sequential, each bitmap/canvas is released before the next
// page. Archives are request-local browser Blobs, with a bounded memory budget.
export async function exportComic(
  options: ExportOptions,
): Promise<{ blob: Blob; filename: string }> {
  const { manifest: m, format, scope, signal } = options
  const selected =
    scope === "album"
      ? m.chapters
      : [m.chapters.find((c) => c.id === m.chapter_id) ?? m.chapters[0]].filter(
          Boolean,
        )
  if (!selected.length) throw new ComicExportError("empty")
  if (selected.length > 3000) throw new ComicExportError("limit")
  const chapters: JMManifest[] = []
  let plannedPages = 0
  for (const chapter of selected) {
    check(signal)
    const detail =
      m.chapter_id === chapter.id
        ? m
        : await options.loadChapter(chapter.path, signal)
    if (
      detail.mode !== m.mode ||
      detail.source !== m.source ||
      detail.album_id !== m.album_id ||
      detail.chapter_id !== chapter.id
    )
      throw new ComicExportError("mode_changed")
    if (!detail.pages.length) throw new ComicExportError("empty")
    plannedPages += detail.pages.length
    if (plannedPages > 3000) throw new ComicExportError("limit")
    chapters.push(detail)
  }
  const total = chapters.reduce((n, c) => n + c.pages.length, 0)
  if (total > 3000) throw new ComicExportError("limit")
  const title = `JM${m.album_id} ${m.title}${scope === "chapter" ? " - " + selected[0].name : ""}`
  const { ZipWriter, BlobWriter, BlobReader, TextReader } =
    await import("@zip.js/zip.js")
  check(signal)
  const archiveWriter =
    format !== "pdf"
      ? new BlobWriter(
          format === "epub"
            ? "application/epub+zip"
            : format === "cbz"
              ? "application/vnd.comicbook+zip"
              : "application/zip",
        )
      : undefined
  const zip = archiveWriter
    ? new ZipWriter(archiveWriter, {
        level: 0,
        useWebWorkers: false,
        zip64: false,
        extendedTimestamp: false,
        dataDescriptor: false,
      })
    : undefined
  const pdf =
    format === "pdf"
      ? await (await import("pdf-lib")).PDFDocument.create()
      : undefined
  pdf?.setTitle(title)
  pdf?.setAuthor((m.authors ?? []).join(" / "))
  pdf?.setSubject(m.description)
  pdf?.setKeywords(m.tags ?? [])
  let bytes = 0,
    completed = 0
  const addText = async (name: string, content: string) => {
    check(signal)
    bytes += new TextEncoder().encode(content).byteLength
    if (bytes > 256 * MiB) throw new ComicExportError("limit")
    await zip!.add(name, new TextReader(content), { signal })
  }
  const bookItems: string[] = [],
    spine: string[] = [],
    navigation: string[] = []
  try {
    if (format === "epub") {
      await addText("mimetype", "application/epub+zip")
      await addText(
        "META-INF/container.xml",
        `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
      )
    } else if (zip)
      await addText(
        "README.txt",
        `${title}\n${(m.authors ?? []).join(" / ")}\n${(m.tags ?? []).join(" / ")}\n\n${m.description}\n`,
      )
    for (let ci = 0; ci < chapters.length; ci++) {
      const chapter = chapters[ci]
      if (format === "epub")
        navigation.push(
          `<li><a href="p${String(completed + 1).padStart(6, "0")}.xhtml">${xml(selected[ci].name)}</a></li>`,
        )
      for (let pi = 0; pi < chapter.pages.length; pi++) {
        check(signal)
        options.progress(completed, total, selected[ci].name)
        const image = await exportImage(
          chapter.pages[pi],
          m.mode,
          format,
          signal,
        )
        bytes += image.blob.size
        if (bytes > (format === "pdf" ? 64 : 256) * MiB)
          throw new ComicExportError("limit")
        const id = `p${String(completed + 1).padStart(6, "0")}`
        if (pdf) {
          const embedded = await pdf.embedPng(await image.blob.arrayBuffer())
          const scale = Math.min(1, 600 / image.width, 12000 / image.height)
          const width = image.width * scale,
            height = image.height * scale
          const page = pdf.addPage([width, height])
          page.drawImage(embedded, {
            x: 0,
            y: 0,
            width,
            height,
          })
          await pdf.flush()
        } else if (format === "epub") {
          const src = `images/${id}.${image.extension}`
          await zip!.add(`OEBPS/${src}`, new BlobReader(image.blob), { signal })
          await addText(
            `OEBPS/${id}.xhtml`,
            `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${xml(selected[ci].name)} ${pi + 1}</title><meta name="viewport" content="width=${image.width},height=${image.height}"/><style>html,body{margin:0;padding:0;width:100%;height:100%}img{display:block;width:100%;height:100%;object-fit:contain}</style></head><body><img src="${src}" alt="${pi + 1}"/></body></html>`,
          )
          bookItems.push(
            `<item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/><item id="${id}img" href="${src}" media-type="${image.mediaType}"/>`,
          )
          spine.push(`<itemref idref="${id}"/>`)
        } else {
          const dir = `${String(ci + 1).padStart(3, "0")} ${exportName(selected[ci].name)}`
          await zip!.add(
            `${dir}/${String(pi + 1).padStart(4, "0")}.${image.extension}`,
            new BlobReader(image.blob),
            { signal },
          )
        }
        completed++
      }
    }
    check(signal)
    if (format === "epub") {
      await addText(
        "OEBPS/nav.xhtml",
        `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>${xml(title)}</title></head><body><nav epub:type="toc"><h1>${xml(title)}</h1><ol>${navigation.join("")}</ol></nav></body></html>`,
      )
      await addText(
        "OEBPS/content.opf",
        `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" prefix="rendition: http://www.idpf.org/vocab/rendition/#"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:jmcomic:${xml(m.source)}:${xml(m.album_id)}:${scope === "chapter" ? xml(selected[0].id) : "all"}</dc:identifier><dc:title>${xml(title)}</dc:title><dc:language>zh</dc:language>${(m.authors ?? []).map((a) => `<dc:creator>${xml(a)}</dc:creator>`).join("")}${(m.tags ?? []).map((a) => `<dc:subject>${xml(a)}</dc:subject>`).join("")}<dc:description>${xml(m.description)}</dc:description><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta><meta property="rendition:layout">pre-paginated</meta><meta property="rendition:spread">none</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${bookItems.join("")}</manifest><spine>${spine.join("")}</spine></package>`,
      )
    }
    const blob = pdf
      ? new Blob([(await pdf.save()).slice().buffer], {
          type: "application/pdf",
        })
      : await zip!.close()
    check(signal)
    if (blob.size > 256 * MiB) throw new ComicExportError("limit")
    options.progress(completed, total, "")
    return { blob, filename: `${exportName(title)}.${format}` }
  } catch (error) {
    // Do not finish or offer a partial archive after a failed/cancelled page.
    await archiveWriter?.writable.abort().catch(() => {})
    throw error
  }
}

export function downloadExport(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
