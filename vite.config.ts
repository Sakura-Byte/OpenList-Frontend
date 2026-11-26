import path from "path"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import legacy from "@vitejs/plugin-legacy"
import { viteStaticCopy } from "vite-plugin-static-copy"

const rootDir = import.meta.dirname
const isLegacy = process.env.VITE_LEGACY === "true"
const isLite = process.env.VITE_LITE === "true"

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(rootDir, "src"),
      "solid-icons": path.resolve(rootDir, "node_modules/solid-icons"),
    },
  },
  plugins: [
    solidPlugin(),
    isLegacy
      ? legacy({
          targets: ["defaults"],
        })
      : null,
    !isLite
      ? viteStaticCopy({
          targets: [
            {
              src: "node_modules/monaco-editor/min/*",
              dest: "static/monaco-editor",
            },
            {
              src: "node_modules/katex/dist/katex.min.css",
              dest: "static/katex",
            },
            {
              src: "node_modules/katex/dist/fonts/*",
              dest: "static/katex/fonts",
            },
            {
              src: "node_modules/mermaid/dist/mermaid.min.js",
              dest: "static/mermaid",
            },
            {
              src: "node_modules/libheif-js/libheif-wasm/libheif.{js,wasm}",
              dest: "static/libheif",
            },
            {
              src: "node_modules/@jellyfin/libass-wasm/dist/js/subtitles-octopus-worker.{js,wasm}",
              dest: "static/libass-wasm",
            },
            {
              src: "src/components/artplayer-plugin-ass/fonts/*",
              dest: "static/fonts",
            },
          ],
        })
      : null,
  ],
  base: "/",
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      const clean = filename.replace(/^\/+/, "")
      if (hostType === "js") {
        return {
          runtime: `window.__openlistAssetUrl(${JSON.stringify(clean)})`,
        }
      }
      if (hostType === "css") {
        return { relative: true }
      }
      return `/${clean}`
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: process.env.DEV_PROXY_TARGET || "http://localhost:5244",
        changeOrigin: true,
      },
    },
  },
})
