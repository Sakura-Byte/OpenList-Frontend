import { Button } from "@hope-ui/solid"
import { TbPuzzle, TbSettings } from "solid-icons/tb"
import { Show } from "solid-js"
import { useRouter, useT } from "~/hooks"
import { PluginItem } from "~/types"
import { DeletePopover } from "../common/DeletePopover"

export interface PluginItemProps {
  plugin: PluginItem
  onConfig?: (plugin: PluginItem) => void
  onToggle: (plugin: PluginItem) => void
  onDelete: (plugin: PluginItem) => void
}

export function PluginOp(props: PluginItemProps) {
  const t = useT()
  const { to } = useRouter()
  return (
    <div
      style={{
        display: "inline-flex",
        "align-items": "center",
        "flex-wrap": "wrap",
        gap: "6px",
      }}
    >
      <Button
        size="sm"
        colorScheme="neutral"
        onClick={() => {
          to(`/@manage/plugins/config/${encodeURIComponent(props.plugin.id)}`)
        }}
      >
        <TbSettings
          size={14}
          class="ol-ico"
          style={{ "margin-right": "4px" }}
        />
        {t("global.edit")}
      </Button>
      <Button
        size="sm"
        colorScheme={props.plugin.enabled ? "neutral" : "primary"}
        onClick={() => {
          props.onToggle(props.plugin)
        }}
      >
        {t(`global.${props.plugin.enabled ? "disable" : "enable"}`)}
      </Button>
      <DeletePopover
        name={props.plugin.name}
        onClick={() => {
          props.onDelete(props.plugin)
        }}
      />
    </div>
  )
}

const PluginIconTile = (props: { icon?: string; size?: number }) => {
  const dim = () => props.size ?? 32
  return (
    <span
      style={{
        display: "inline-grid",
        "place-items": "center",
        width: `${dim()}px`,
        height: `${dim()}px`,
        "border-radius": "var(--ol-radius-sm)",
        background: "var(--ol-surface-2)",
        border: "1px solid var(--ol-border)",
        color: "var(--ol-accent-text)",
        flex: "none",
        overflow: "hidden",
      }}
    >
      <Show
        when={props.icon}
        fallback={<TbPuzzle size={Math.round(dim() * 0.52)} class="ol-ico" />}
      >
        <img
          src={props.icon}
          alt=""
          style={{
            width: `${Math.round(dim() * 0.6)}px`,
            height: `${Math.round(dim() * 0.6)}px`,
            "object-fit": "contain",
          }}
        />
      </Show>
    </span>
  )
}

export function PluginListItem(props: PluginItemProps) {
  const t = useT()
  return (
    <tr>
      <td>
        <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
          <PluginIconTile icon={props.plugin.icon} size={30} />
          <div style={{ "min-width": "0" }}>
            <div
              style={{ "font-weight": "560", color: "var(--ol-text-primary)" }}
            >
              {props.plugin.name}
            </div>
            <div
              style={{
                "font-family": "var(--ol-font-mono)",
                "font-size": "12px",
                color: "var(--ol-text-muted)",
              }}
            >
              {props.plugin.id}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span class="ol-pill">{props.plugin.type || "ui"}</span>
      </td>
      <td>
        <span
          class="ol-tabular"
          style={{
            "font-family": "var(--ol-font-mono)",
            "font-size": "12.5px",
            color: "var(--ol-text-secondary)",
          }}
        >
          v{props.plugin.version || "1.0.0"}
        </span>
      </td>
      <td>
        <span style={{ color: "var(--ol-text-secondary)" }}>
          {props.plugin.author || "Community"}
        </span>
      </td>
      <td>
        <div
          style={{
            display: "inline-flex",
            "align-items": "center",
            gap: "8px",
          }}
        >
          <span class="ol-status">
            <span
              class="ol-status-dot"
              data-status={props.plugin.enabled ? "work" : "disabled"}
            />
            <span>
              {t(`global.${props.plugin.enabled ? "enable" : "disable"}`)}
            </span>
          </span>
          <Show when={props.plugin.high_privilege}>
            <span class="ol-pill" data-tone="danger">
              Root
            </span>
          </Show>
        </div>
      </td>
      <td>
        <PluginOp {...props} />
      </td>
    </tr>
  )
}

export function PluginGridItem(props: PluginItemProps) {
  const t = useT()

  return (
    <div
      class="ol-admin-card"
      style={{
        display: "flex",
        "flex-direction": "column",
        "justify-content": "space-between",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
        <div
          style={{
            display: "flex",
            "align-items": "flex-start",
            "justify-content": "space-between",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              "align-items": "center",
              gap: "10px",
              "min-width": "0",
            }}
          >
            <PluginIconTile icon={props.plugin.icon} size={34} />
            <div style={{ "min-width": "0" }}>
              <div
                style={{
                  "font-weight": "600",
                  "font-size": "14px",
                  color: "var(--ol-text-primary)",
                }}
              >
                {props.plugin.name}
              </div>
              <div
                style={{
                  "font-family": "var(--ol-font-mono)",
                  "font-size": "12px",
                  color: "var(--ol-text-muted)",
                }}
              >
                {props.plugin.id}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              "align-items": "center",
              gap: "6px",
              flex: "none",
            }}
          >
            <span class="ol-status">
              <span
                class="ol-status-dot"
                data-status={props.plugin.enabled ? "work" : "disabled"}
              />
              <span>
                {t(`global.${props.plugin.enabled ? "enable" : "disable"}`)}
              </span>
            </span>
            <Show when={props.plugin.high_privilege}>
              <span class="ol-pill" data-tone="danger">
                Root
              </span>
            </Show>
          </div>
        </div>

        <p
          style={{
            margin: "0",
            "font-size": "13px",
            color: "var(--ol-text-secondary)",
            "min-height": "38px",
          }}
        >
          {props.plugin.description || t("plugins.empty_desc")}
        </p>

        <div
          style={{
            display: "flex",
            "align-items": "center",
            "flex-wrap": "wrap",
            gap: "8px",
            "font-size": "12px",
            color: "var(--ol-text-muted)",
          }}
        >
          <span
            class="ol-tabular"
            style={{ "font-family": "var(--ol-font-mono)" }}
          >
            v{props.plugin.version || "1.0.0"}
          </span>
          <span>·</span>
          <span>{props.plugin.author || "Community"}</span>
          <span>·</span>
          <span class="ol-pill">{props.plugin.type || "ui"}</span>
        </div>
      </div>

      <div
        class="ol-admin-card__foot"
        style={{ "justify-content": "flex-end", "margin-top": "4px" }}
      >
        <PluginOp {...props} />
      </div>
    </div>
  )
}
