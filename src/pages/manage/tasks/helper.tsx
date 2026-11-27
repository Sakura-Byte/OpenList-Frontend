import { TbExternalLink, TbFolder } from "solid-icons/tb"
import { JSX } from "solid-js"
import { useT } from "~/hooks"
import { me } from "~/store"
import { TaskNameAnalyzer } from "./Tasks"

export const getPath = (
  device: string,
  path: string,
  asLink: boolean = true,
): JSX.Element => {
  const fullPath = (device === "/" ? "" : device) + path
  const prefix = me().base_path === "/" ? "" : me().base_path
  const accessible = fullPath.startsWith(prefix)
  return accessible && asLink ? (
    <a
      class="ol-link-btn"
      style={{
        display: "inline-flex",
        "align-items": "center",
        gap: "4px",
        "font-family": "var(--ol-font-mono)",
        "font-size": "12.5px",
      }}
      href={fullPath.slice(prefix.length) || "/"}
    >
      <TbFolder size={13} class="ol-ico" />
      <span>{fullPath}</span>
    </a>
  ) : (
    <span
      style={{
        "font-family": "var(--ol-font-mono)",
        "font-size": "12.5px",
      }}
    >
      {fullPath}
    </span>
  )
}

const renderExternalUrl = (url: string): JSX.Element => (
  <a
    class="ol-link-btn"
    style={{
      display: "inline-flex",
      "align-items": "center",
      gap: "4px",
      "font-family": "var(--ol-font-mono)",
      "font-size": "12.5px",
    }}
    href={url}
    target="_blank"
    rel="noopener noreferrer"
  >
    <span>{url}</span>
    <TbExternalLink size={13} class="ol-ico" />
  </a>
)

export const getOfflineDownloadNameAnalyzer = (): TaskNameAnalyzer => {
  const t = useT()
  return {
    regex: /^download (.+) to \((.+)\)$/,
    title: (matches) => matches[1],
    attrs: {
      [t("tasks.attr.offline_download.url")]: (matches) =>
        renderExternalUrl(matches[1]),
      [t("tasks.attr.offline_download.path")]: (matches) =>
        getPath("", matches[2]),
    },
  }
}

export const getOfflineDownloadTransferNameAnalyzer = (): TaskNameAnalyzer => {
  const t = useT()
  return {
    regex: /^(transfer|upload) \[(.*)]\((.*\/([^\/]+))\) to \[(.+)]\((.+)\)$/,
    title: (matches) => (matches[1] === "upload" ? matches[2] : matches[4]),
    attrs: {
      [t("tasks.attr.offline_download.transfer_src")]: (matches) => {
        return matches[1] !== "transfer" || matches[2] === ""
          ? undefined
          : getPath(matches[2], matches[3])
      },
      [t("tasks.attr.offline_download.transfer_src_local")]: (matches) => {
        return matches[2] === "" ? matches[3] : undefined
      },
      [t("tasks.attr.offline_download.url")]: (matches) => {
        return matches[1] === "upload"
          ? renderExternalUrl(matches[3])
          : undefined
      },
      [t("tasks.attr.offline_download.transfer_dst")]: (matches) =>
        getPath(matches[5], matches[6]),
    },
  }
}

export const getDecompressNameAnalyzer = (): TaskNameAnalyzer => {
  const t = useT()
  return {
    regex:
      /^decompress \[(.+)]\((.*\/([^\/]+))\)\[(.+)] to \[(.+)]\((.+)\) with password <(.*)>$/,
    title: (matches) => matches[3],
    attrs: {
      [t("tasks.attr.decompress.src")]: (matches) =>
        getPath(matches[1], matches[2]),
      [t("tasks.attr.decompress.dst")]: (matches) =>
        getPath(matches[5], matches[6]),
      [t("tasks.attr.decompress.inner")]: (matches) => (
        <span style={{ "font-family": "var(--ol-font-mono)" }}>
          {matches[4]}
        </span>
      ),
      [t("tasks.attr.decompress.password")]: (matches) => (
        <span style={{ "font-family": "var(--ol-font-mono)" }}>
          {matches[7]}
        </span>
      ),
    },
  }
}

export const getDecompressUploadNameAnalyzer = (): TaskNameAnalyzer => {
  const t = useT()
  return {
    regex: /^upload (.+) to \[(.+)]\((.+)\)$/,
    title: (matches) => matches[1],
    attrs: {
      [t("tasks.attr.decompress.dst")]: (matches) =>
        getPath(matches[2], matches[3]),
    },
  }
}
