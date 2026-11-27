import { Message } from "./Messenger"

export const StringShow = (props: Message) => {
  return (
    <div
      style={{
        padding: "10px 14px",
        "border-radius": "var(--ol-radius-md)",
        background: "var(--ol-surface-2)",
        border: "1px solid var(--ol-border)",
        color: "var(--ol-text-primary)",
        "font-size": "13.5px",
        "line-height": "1.55",
        "white-space": "pre-wrap",
        "word-break": "break-word",
      }}
    >
      {props.content}
    </div>
  )
}

export const ImageShow = (props: Message) => {
  return (
    <div
      style={{
        padding: "10px",
        "border-radius": "var(--ol-radius-md)",
        background: "var(--ol-surface-2)",
        border: "1px solid var(--ol-border)",
        display: "inline-flex",
        "max-width": "100%",
      }}
    >
      <img
        src={props.content}
        alt=""
        style={{
          "max-width": "100%",
          "max-height": "360px",
          "object-fit": "contain",
          "border-radius": "var(--ol-radius-sm)",
        }}
      />
    </div>
  )
}
