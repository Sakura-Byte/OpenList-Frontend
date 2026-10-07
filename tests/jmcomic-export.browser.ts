// Run in an isolated browser page served by Vite:
// (await import('/tests/jmcomic-export.browser.ts')).runExportTests()
// Fixtures are generated locally; no upstream metadata or image is requested.
import { exportComic, exportImage } from "../src/pages/home/jmcomic/export"
import { restoreMoves } from "../src/pages/home/jmcomic/restore"
import { ZipReader, BlobReader, BlobWriter } from "@zip.js/zip.js"
import type { FileEntry } from "@zip.js/zip.js"
import { PDFDocument } from "pdf-lib"
import type { JMManifest } from "../src/types/jmcomic"

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}
export async function runExportTests() {
  const original = document.createElement("canvas")
  original.width = 2
  original.height = 7
  const ctx = original.getContext("2d")!
  for (let y = 0; y < 7; y++) {
    ctx.fillStyle = `rgb(${y * 30},20,100)`
    ctx.fillRect(0, y, 2, 1)
  }
  const source = document.createElement("canvas")
  source.width = 2
  source.height = 7
  const sc = source.getContext("2d")!
  for (const move of restoreMoves(7, 3))
    for (let y = 0; y < move.height; y++) {
      sc.fillStyle = `rgb(${(move.target + y) * 30},20,100)`
      sc.fillRect(0, move.source + y, 2, 1)
    }
  const png = await new Promise<Blob>((resolve) =>
    original.toBlob((b) => resolve(b!)),
  )
  const scrambled = await new Promise<Blob>((resolve) =>
    source.toBlob((b) => resolve(b!)),
  )
  const actualFetch = window.fetch
  const actualBitmap = window.createImageBitmap
  const calls: string[] = []
  let liveBitmaps = 0
  window.createImageBitmap = (async (
    ...args: Parameters<typeof createImageBitmap>
  ) => {
    const image = (await (actualBitmap as Function)(...args)) as ImageBitmap
    liveBitmaps++
    const close = image.close.bind(image)
    image.close = () => {
      liveBitmaps--
      close()
    }
    return image
  }) as typeof createImageBitmap
  window.fetch = async (input, options) => {
    const url = String(input)
    calls.push(url)
    assert(
      options?.credentials === "omit",
      "Images must not receive account credentials",
    )
    return new Response(url.includes("client") ? scrambled : png, {
      headers: { "Content-Type": "image/png" },
    })
  }
  const chapters = [
    { id: "42", name: "First <chapter> &", path: "/work/c1" },
    { id: "43", name: "Second", path: "/work/c2" },
  ]
  const outputs: { name: string; base64: string }[] = []
  const results: {
    mode: string
    format: string
    bytes: number
    pages: number
  }[] = []
  const makeManifest = (mode: "client" | "server"): JMManifest => ({
    source: "fixture",
    mode,
    album_id: "42",
    album_path: "/work",
    title: "Title <test> &",
    description: "Escaped <script> & text",
    authors: ["Author"],
    tags: ["Tag"],
    date: "2026-10-07",
    updated: 0,
    chapters,
    pages: [],
    cover: "",
  })
  const load = (m: JMManifest, path: string) =>
    Promise.resolve({
      ...m,
      chapter_id: path.endsWith("c1") ? "42" : "43",
      pages: Array.from({ length: path.endsWith("c1") ? 1 : 2 }, (_, i) => ({
        name: `${i}.jpg`,
        url:
          m.mode === "client"
            ? "https://fixture.invalid/client.png"
            : `${location.origin}/d/server.png`,
        segments: 3,
        gif: false,
      })),
    })
  try {
    for (const mode of ["client", "server"] as const)
      for (const format of ["epub", "cbz", "pdf", "zip"] as const) {
        const m = makeManifest(mode),
          before = calls.length
        const out = await exportComic({
          manifest: m,
          format,
          scope: "album",
          signal: new AbortController().signal,
          loadChapter: (path) => load(m, path),
          progress: () => {},
        })
        assert(
          calls.length - before === 3,
          "Fetch only one image at a time, once per page",
        )
        const data = new Uint8Array(await out.blob.arrayBuffer())
        if (format === "pdf") {
          const pdf = await PDFDocument.load(data)
          assert(pdf.getPageCount() === 3, "PDF page order/count")
          assert(pdf.getTitle()?.includes("<test> &"), "PDF metadata")
        } else {
          const reader = new ZipReader(new BlobReader(out.blob)),
            entries = (await reader.getEntries()).filter(
              (entry): entry is FileEntry => !entry.directory,
            )
          const pictures = entries.filter((e) => e.filename.endsWith(".png"))
          assert(pictures.length === 3, "Archive page count")
          for (const entry of pictures) {
            const b = await entry.getData!(new BlobWriter()),
              bitmap = await createImageBitmap(b)
            const canvas = document.createElement("canvas")
            canvas.width = 2
            canvas.height = 7
            canvas.getContext("2d")!.drawImage(bitmap, 0, 0)
            const rgba = canvas.getContext("2d")!.getImageData(0, 0, 2, 7).data
            for (let y = 0; y < 7; y++)
              assert(
                rgba[y * 8] === y * 30,
                "Restore stripes including remainder rows",
              )
            bitmap.close()
            canvas.width = canvas.height = 1
          }
          if (format === "epub") {
            const header = new DataView(data.buffer)
            assert(
              entries[0].filename === "mimetype" &&
                header.getUint16(8, true) === 0 &&
                header.getUint16(28, true) === 0,
              "EPUB mimetype must be first, stored, without extra fields",
            )
            for (const entry of entries.filter((e) =>
              /\.(xml|opf|xhtml)$/.test(e.filename),
            )) {
              const text = await (await entry.getData!(new BlobWriter())).text()
              const doc = new DOMParser().parseFromString(
                text,
                "application/xml",
              )
              assert(
                !doc.querySelector("parsererror"),
                "Escaped valid EPUB XML",
              )
            }
          }
          await reader.close()
        }
        assert(
          liveBitmaps === 0,
          "Release all decoded images after each export",
        )
        let raw = ""
        for (const byte of data) raw += String.fromCharCode(byte)
        outputs.push({ name: `${mode}.${format}`, base64: btoa(raw) })
        results.push({ mode, format, bytes: data.length, pages: 3 })
      }
    const m = makeManifest("client"),
      controller = new AbortController(),
      before = calls.length
    let cancelled = false
    try {
      await exportComic({
        manifest: m,
        format: "zip",
        scope: "album",
        signal: controller.signal,
        loadChapter: (path) => load(m, path),
        progress: (n) => {
          if (n === 1) controller.abort()
        },
      })
    } catch (e) {
      cancelled = (e as Error).name === "AbortError"
    }
    assert(
      cancelled && calls.length - before === 1 && liveBitmaps === 0,
      "Cancel without partial archive or later image requests",
    )
    window.fetch = async () => {
      throw new TypeError("Failed to fetch")
    }
    let cors = false
    try {
      await exportImage(
        {
          name: "1.png",
          url: "https://blocked.invalid/image.png",
          segments: 3,
          gif: false,
        },
        "client",
        "epub",
        new AbortController().signal,
      )
    } catch (e) {
      cors = (e as { code?: string }).code === "cors"
    }
    assert(cors, "CORS failures must not fall back to server content")
    window.fetch = async () =>
      new Response(png, {
        headers: { "Content-Length": String(16 * 1024 * 1024 + 1) },
      })
    let limit = false
    try {
      await exportImage(
        {
          name: "1.png",
          url: "https://fixture.invalid/large.png",
          segments: 0,
          gif: false,
        },
        "server",
        "zip",
        new AbortController().signal,
      )
    } catch (e) {
      limit = (e as { code?: string }).code === "limit"
    }
    assert(limit && liveBitmaps === 0, "Reject large input before decoding")
    // A locally generated 1×1 two-frame GIF: red, then green.
    const gifBytes = new Uint8Array([
      71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 0, 0, 0, 255, 0, 33,
      255, 11, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0, 33,
      249, 4, 0, 10, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 33,
      249, 4, 0, 10, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 76, 1, 0, 59,
    ])
    window.fetch = async () =>
      new Response(gifBytes, { headers: { "Content-Type": "image/gif" } })
    for (const mode of ["client", "server"] as const) {
      const page = {
        name: "animated.gif",
        url: "https://fixture.invalid/animated.gif",
        segments: 3,
        gif: true,
      }
      const frame = await exportImage(
        page,
        mode,
        "pdf",
        new AbortController().signal,
      )
      assert(frame.extension === "png", "PDF uses a static GIF frame")
      const image = await createImageBitmap(frame.blob),
        c = document.createElement("canvas")
      c.width = c.height = 1
      c.getContext("2d")!.drawImage(image, 0, 0)
      assert(
        c.getContext("2d")!.getImageData(0, 0, 1, 1).data[0] === 255,
        "GIF first frame remains red",
      )
      image.close()
      c.width = c.height = 1
      for (const format of ["epub", "cbz", "zip"] as const) {
        const m = makeManifest(mode)
        const out = await exportComic({
          manifest: m,
          format,
          scope: "chapter",
          signal: new AbortController().signal,
          loadChapter: async () => ({ ...m, chapter_id: "42", pages: [page] }),
          progress: () => {},
        })
        const r = new ZipReader(new BlobReader(out.blob))
        const entry = (await r.getEntries()).find(
          (e): e is FileEntry => !e.directory && e.filename.endsWith(".gif"),
        )
        assert(entry, "GIF archive entry exists")
        const kept = new Uint8Array(
          await (await entry.getData(new BlobWriter())).arrayBuffer(),
        )
        assert(
          kept.length === gifBytes.length &&
            kept.every((b, i) => b === gifBytes[i]),
          "Keep original GIF animation bytes",
        )
        await r.close()
      }
    }
    assert(liveBitmaps === 0, "GIF decoding resources released")
    return { results, cancelled, cors, limit, liveBitmaps, outputs }
  } finally {
    window.fetch = actualFetch
    window.createImageBitmap = actualBitmap
    original.width = original.height = source.width = source.height = 1
  }
}
