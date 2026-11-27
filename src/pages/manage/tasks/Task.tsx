import { Button, Checkbox } from "@hope-ui/solid"
import {
  TbAlertCircle,
  TbChevronDown,
  TbChevronUp,
  TbRotateClockwise,
  TbTrash,
  TbUser,
  TbX,
} from "solid-icons/tb"
import { createSignal, For, Show } from "solid-js"
import { useFetch, useT } from "~/hooks"
import { me } from "~/store"
import { PEmptyResp } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { TaskAttribute, TaskLocalSetter, TasksProps } from "./Tasks"

enum TaskStateEnum {
  Pending,
  Running,
  Succeeded,
  Canceling,
  Canceled,
  Errored,
  Failing,
  Failed,
  WaitingRetry,
  BeforeRetry,
}

const stateDotStatus = (
  state: number,
): "work" | "disabled" | "error" | "info" | "warn" => {
  switch (state) {
    case TaskStateEnum.Succeeded:
      return "work"
    case TaskStateEnum.Running:
      return "info"
    case TaskStateEnum.Pending:
    case TaskStateEnum.WaitingRetry:
    case TaskStateEnum.BeforeRetry:
      return "warn"
    case TaskStateEnum.Canceling:
    case TaskStateEnum.Canceled:
      return "disabled"
    case TaskStateEnum.Errored:
    case TaskStateEnum.Failing:
    case TaskStateEnum.Failed:
    default:
      return "error"
  }
}

const Creator = (props: { name: string; role: number }) => {
  if (props.role < 0) return null
  return (
    <span
      class="ol-pill"
      style={{
        "max-width": "120px",
        overflow: "hidden",
        "text-overflow": "ellipsis",
      }}
      title={props.name}
    >
      <TbUser size={12} class="ol-ico" />
      <span
        style={{
          overflow: "hidden",
          "text-overflow": "ellipsis",
          "white-space": "nowrap",
        }}
      >
        {props.name}
      </span>
    </span>
  )
}

export const TaskState = (props: { state: number }) => {
  const t = useT()
  return (
    <span class="ol-status">
      <span class="ol-status-dot" data-status={stateDotStatus(props.state)} />
      <span>{t(`tasks.state.${props.state}`)}</span>
    </span>
  )
}

export type TaskOrderBy = "name" | "creator" | "state" | "progress"

export interface TaskCol {
  name: TaskOrderBy | "speed" | "operation"
  textAlign: "left" | "right" | "center"
  w: any
}

export const cols: TaskCol[] = [
  {
    name: "name",
    textAlign: "left",
    w: me().role === 2 ? "calc(100% - 660px)" : "calc(100% - 560px)",
  },
  { name: "creator", textAlign: "center", w: me().role === 2 ? "100px" : "0" },
  { name: "state", textAlign: "center", w: "100px" },
  { name: "progress", textAlign: "left", w: "140px" },
  { name: "speed", textAlign: "center", w: "100px" },
  { name: "operation", textAlign: "right", w: "220px" },
]

export interface TaskLocal {
  selected: boolean
  expanded: boolean
}

const toTimeNumber = (n: number) => {
  return Math.floor(Math.max(0, n)).toString().padStart(2, "0")
}

const getTimeStr = (millisecond: number) => {
  const sec = (millisecond / 1000) % 60
  const min = (millisecond / 1000 / 60) % 60
  const hour = millisecond / 1000 / 3600
  return `${toTimeNumber(hour)}:${toTimeNumber(min)}:${toTimeNumber(sec)}`
}

export const Task = (props: TaskAttribute & TasksProps & TaskLocalSetter) => {
  const t = useT()
  const operateName = props.done === "undone" ? "cancel" : "delete"
  const canRetry =
    props.done === "done" &&
    (props.state === TaskStateEnum.Failed ||
      props.state === TaskStateEnum.Canceled)
  const [operateLoading, operate] = useFetch((): PEmptyResp =>
    r.post(`/task/${props.type}/${operateName}?tid=${props.id}`),
  )
  const [retryLoading, retry] = useFetch((): PEmptyResp =>
    r.post(`/task/${props.type}/retry?tid=${props.id}`),
  )
  const [deleted, setDeleted] = createSignal(false)

  const matches = () => props.name.match(props.nameAnalyzer.regex)
  const title = () => {
    const m = matches()
    return m === null ? props.name : props.nameAnalyzer.title(m)
  }

  const startTime = () =>
    props.start_time === null ? -1 : new Date(props.start_time).getTime()
  const endTime = () =>
    props.end_time === null
      ? new Date().getTime()
      : new Date(props.end_time).getTime()

  const parseSpeedText = (timeDelta: number, lengthDelta: number) => {
    if (timeDelta <= 0 || lengthDelta < 0 || !Number.isFinite(lengthDelta)) {
      return "—"
    }
    let delta = lengthDelta / timeDelta
    const units = ["B/s", "KiB/s", "MiB/s", "GiB/s", "TiB/s", "PiB/s", "EiB/s"]
    const k = 1024
    let unit_i = 0
    while (unit_i < units.length - 1 && delta >= k) {
      delta /= k
      unit_i++
    }
    return `${delta.toFixed(2)} ${units[unit_i]}`
  }

  const speedText = () => {
    const st = startTime()
    const et = endTime()
    if (props.done === "done") {
      if (
        props.start_time !== props.end_time &&
        props.progress > 0 &&
        st !== -1
      ) {
        const timeDelta = (et - st) / 1000
        const lengthDelta = (props.total_bytes * props.progress) / 100
        return parseSpeedText(timeDelta, lengthDelta)
      }
      return "—"
    }
    if (
      props.prevProgress !== undefined &&
      props.prevFetchTime !== undefined &&
      props.curFetchTime > props.prevFetchTime
    ) {
      const timeDelta = (props.curFetchTime - props.prevFetchTime) / 1000
      const lengthDelta =
        ((props.progress - props.prevProgress) * props.total_bytes) / 100
      return parseSpeedText(timeDelta, lengthDelta)
    }
    return "—"
  }

  const clampedProgress = () =>
    Math.min(100, Math.max(0, Number(props.progress) || 0))

  const barColor = () => {
    if (
      props.state === TaskStateEnum.Failed ||
      props.state === TaskStateEnum.Errored
    ) {
      return "var(--ol-danger)"
    }
    if (props.state === TaskStateEnum.Succeeded) {
      return "var(--ol-type-image)"
    }
    return "var(--ol-accent)"
  }

  return (
    <Show when={!deleted()}>
      <div
        class="ol-admin-card"
        style={{
          padding: "12px 16px",
          background: "var(--ol-surface-card)",
        }}
      >
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "space-between",
            "flex-wrap": "wrap",
            gap: "10px 14px",
          }}
        >
          {/* Left: Checkbox + Task Name */}
          <div
            style={{
              display: "flex",
              "align-items": "center",
              gap: "10px",
              flex: "1 1 240px",
              "min-width": "0",
            }}
          >
            <Checkbox
              on:click={(e: MouseEvent) => {
                e.stopPropagation()
              }}
              checked={props.local.selected}
              onChange={(e: any) => {
                props.setLocal({
                  selected: e.target.checked as boolean,
                  expanded: props.local.expanded,
                })
              }}
            />
            <span
              style={{
                "font-size": "13.5px",
                "font-weight": "560",
                color: "var(--ol-text-primary)",
                "white-space": "nowrap",
                overflow: "hidden",
                "text-overflow": "ellipsis",
                "min-width": "0",
              }}
              title={title()}
            >
              {title()}
            </span>
          </div>

          {/* Right: Creator, Status Dot, Progress + %, Speed, Actions */}
          <div
            style={{
              display: "flex",
              "align-items": "center",
              "flex-wrap": "wrap",
              gap: "10px 14px",
            }}
          >
            <Show when={me().role === 2}>
              <Creator name={props.creator} role={props.creator_role} />
            </Show>

            <TaskState state={props.state} />

            <div
              style={{
                display: "inline-flex",
                "align-items": "center",
                gap: "8px",
                "min-width": "146px",
              }}
            >
              <div
                style={{
                  flex: "1",
                  width: "90px",
                  height: "6px",
                  "border-radius": "999px",
                  background: "var(--ol-surface-2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${clampedProgress()}%`,
                    height: "100%",
                    "border-radius": "999px",
                    background: barColor(),
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
              <span
                class="ol-tabular"
                style={{
                  "font-size": "12.5px",
                  color: "var(--ol-text-secondary)",
                  "min-width": "48px",
                  "text-align": "right",
                }}
              >
                {clampedProgress().toFixed(1)}%
              </span>
            </div>

            <span
              class="ol-tabular"
              style={{
                "font-size": "12.5px",
                color: "var(--ol-text-muted)",
                "min-width": "82px",
                "text-align": "right",
              }}
            >
              {speedText()}
            </span>

            <div
              style={{
                display: "inline-flex",
                "align-items": "center",
                gap: "6px",
              }}
            >
              <Show when={props.canRetry && canRetry}>
                <Button
                  size="xs"
                  colorScheme="neutral"
                  loading={retryLoading()}
                  onClick={async () => {
                    const resp = await retry()
                    handleResp(resp, () => {
                      notify.info(t("tasks.retry"))
                      setDeleted(true)
                    })
                  }}
                >
                  <TbRotateClockwise
                    size={13}
                    class="ol-ico"
                    style={{ "margin-right": "4px" }}
                  />
                  {t("tasks.retry")}
                </Button>
              </Show>

              <Button
                size="xs"
                colorScheme="danger"
                loading={operateLoading()}
                onClick={async () => {
                  const resp = await operate()
                  handleResp(resp, () => {
                    notify.success(t("global.delete_success"))
                    setDeleted(true)
                  })
                }}
              >
                <Show
                  when={operateName === "cancel"}
                  fallback={
                    <TbTrash
                      size={13}
                      class="ol-ico"
                      style={{ "margin-right": "4px" }}
                    />
                  }
                >
                  <TbX
                    size={13}
                    class="ol-ico"
                    style={{ "margin-right": "4px" }}
                  />
                </Show>
                {t(`global.${operateName}`)}
              </Button>

              <button
                type="button"
                class="ol-icon-btn"
                style={{ width: "28px", height: "28px" }}
                title={
                  props.local.expanded ? t("tasks.fold") : t("tasks.expand")
                }
                onClick={() => {
                  props.setLocal({
                    selected: props.local.selected,
                    expanded: !props.local.expanded,
                  })
                }}
              >
                <Show
                  when={props.local.expanded}
                  fallback={<TbChevronDown size={15} class="ol-ico" />}
                >
                  <TbChevronUp size={15} class="ol-ico" />
                </Show>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        <Show when={props.local.expanded}>
          <div
            style={{
              "margin-top": "10px",
              "padding-top": "10px",
              "border-top": "1px solid var(--ol-row-line)",
              display: "grid",
              "grid-template-columns": "max-content minmax(0, 1fr)",
              gap: "6px 14px",
              "font-size": "12.5px",
              "word-break": "break-all",
            }}
          >
            <Show when={startTime() !== -1}>
              <span
                style={{
                  color: "var(--ol-text-muted)",
                  "white-space": "nowrap",
                }}
              >
                {t("tasks.attr.time_elapsed")}
              </span>
              <span
                class="ol-tabular"
                style={{ color: "var(--ol-text-secondary)" }}
              >
                {getTimeStr(endTime() - startTime())}
              </span>
            </Show>

            <Show when={matches() !== null}>
              <For each={Object.entries(props.nameAnalyzer.attrs)}>
                {(entry) => {
                  const value = entry[1](matches() as RegExpMatchArray)
                  return (
                    <Show when={value !== undefined}>
                      <span
                        style={{
                          color: "var(--ol-text-muted)",
                          "white-space": "nowrap",
                        }}
                      >
                        {entry[0]}
                      </span>
                      <div style={{ color: "var(--ol-text-secondary)" }}>
                        {value}
                      </div>
                    </Show>
                  )
                }}
              </For>
            </Show>

            <Show when={props.status}>
              <span
                style={{
                  color: "var(--ol-text-muted)",
                  "white-space": "nowrap",
                }}
              >
                {t("tasks.attr.status")}
              </span>
              <span style={{ color: "var(--ol-text-secondary)" }}>
                {props.status}
              </span>
            </Show>

            <Show when={props.error}>
              <span
                style={{
                  color: "var(--ol-danger)",
                  "white-space": "nowrap",
                  display: "inline-flex",
                  "align-items": "center",
                  gap: "4px",
                }}
              >
                <TbAlertCircle size={13} class="ol-ico" />
                {t("tasks.attr.err")}
              </span>
              <span style={{ color: "var(--ol-danger)" }}>{props.error}</span>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  )
}
