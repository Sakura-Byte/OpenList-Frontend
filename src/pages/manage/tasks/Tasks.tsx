import { Button, Checkbox } from "@hope-ui/solid"
import {
  TbArrowDown,
  TbArrowsSort,
  TbArrowUp,
  TbCheck,
  TbChevronDown,
  TbChevronUp,
  TbRefresh,
  TbRotateClockwise,
  TbSearch,
  TbSubtask,
  TbTrash,
  TbX,
} from "solid-icons/tb"
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  onCleanup,
  Show,
} from "solid-js"
import { Paginator } from "~/components"
import { useFetch, useT } from "~/hooks"
import { me } from "~/store"
import { PEmptyResp, PResp, TaskInfo } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { Task, TaskLocal, TaskOrderBy } from "./Task"

export interface TaskNameAnalyzer {
  regex: RegExp
  title: (matches: RegExpMatchArray) => string
  attrs: { [attr: string]: (matches: RegExpMatchArray) => JSX.Element }
}

export interface TasksProps {
  type: string
  done: string
  nameAnalyzer: TaskNameAnalyzer
  canRetry?: boolean
}

export interface TaskViewAttribute {
  curFetchTime: number
  prevFetchTime?: number
  prevProgress?: number
}

export interface TaskLocalContainer {
  local: TaskLocal
}

export interface TaskLocalSetter {
  setLocal: (l: TaskLocal) => void
}

export type TaskAttribute = TaskInfo & TaskViewAttribute & TaskLocalContainer

const undoneStatePriority: Record<number, number> = {
  1: 0,
  0: 1,
  8: 1,
  9: 1,
  3: 2,
  5: 2,
  6: 2,
}

export const Tasks = (props: TasksProps) => {
  const t = useT()
  const [loading, get] = useFetch((): PResp<TaskInfo[]> =>
    r.get(`/task/${props.type}/${props.done}`),
  )
  const [tasks, setTasks] = createSignal<TaskAttribute[]>([])
  const [orderBy, setOrderBy] = createSignal<TaskOrderBy>("name")
  const [orderReverse, setOrderReverse] = createSignal(false)

  const sorter: Record<TaskOrderBy, (a: TaskInfo, b: TaskInfo) => number> = {
    name: (a, b) => (a.name > b.name ? 1 : -1),
    creator: (a, b) =>
      a.creator === b.creator
        ? a.id > b.id
          ? 1
          : -1
        : a.creator > b.creator
          ? 1
          : -1,
    state: (a, b) =>
      a.state === b.state ? (a.id > b.id ? 1 : -1) : a.state > b.state ? 1 : -1,
    progress: (a, b) =>
      a.progress === b.progress
        ? a.id > b.id
          ? 1
          : -1
        : a.progress < b.progress
          ? 1
          : -1,
  }

  const curSorter = createMemo(() => {
    return (a: TaskInfo, b: TaskInfo) => {
      if (props.done === "undone" && orderBy() === "name" && !orderReverse()) {
        const priorityDelta =
          (undoneStatePriority[a.state] ?? 3) -
          (undoneStatePriority[b.state] ?? 3)
        if (priorityDelta !== 0) {
          return priorityDelta
        }
      }
      return (orderReverse() ? -1 : 1) * sorter[orderBy()](a, b)
    }
  })

  const refresh = async () => {
    const resp = await get()
    handleResp(resp, (data) => {
      const fetchTime = new Date().getTime()
      const curFetchTimeMap: Record<string, number> = {}
      const prevFetchTimeMap: Record<string, number | undefined> = {}
      const curProgressMap: Record<string, number> = {}
      const prevProgressMap: Record<string, number | undefined> = {}
      const taskLocalMap: Record<string, TaskLocal> = {}
      for (const task of tasks()) {
        curFetchTimeMap[task.id] = task.curFetchTime
        prevFetchTimeMap[task.id] = task.prevFetchTime
        curProgressMap[task.id] = task.progress
        prevProgressMap[task.id] = task.prevProgress
        taskLocalMap[task.id] = task.local
      }
      setTasks(
        data
          ?.map((task) => {
            let prevFetchTime: number | undefined
            let prevProgress: number | undefined
            if (task.progress === curProgressMap[task.id]) {
              prevFetchTime = prevFetchTimeMap[task.id]
              prevProgress = prevProgressMap[task.id]
            } else {
              prevFetchTime = curFetchTimeMap[task.id]
              prevProgress = curProgressMap[task.id]
            }
            const taskLocal = taskLocalMap[task.id] ?? {
              selected: false,
              expanded: false,
            }
            return {
              ...task,
              curFetchTime: fetchTime,
              prevFetchTime: prevFetchTime,
              prevProgress: prevProgress,
              local: taskLocal,
            }
          })
          .sort(curSorter()) ?? [],
      )
    })
  }
  refresh()

  if (props.done === "undone") {
    const interval = setInterval(refresh, 2000)
    onCleanup(() => clearInterval(interval))
  }

  const [clearDoneLoading, clearDone] = useFetch((): PEmptyResp =>
    r.post(`/task/${props.type}/clear_done`),
  )
  const [clearSucceededLoading, clearSucceeded] = useFetch((): PEmptyResp =>
    r.post(`/task/${props.type}/clear_succeeded`),
  )
  const [retryFailedLoading, retryFailed] = useFetch((): PEmptyResp =>
    r.post(`/task/${props.type}/retry_failed`),
  )

  const [regexFilterValue, setRegexFilterValue] = createSignal("")
  const [regexFilter, setRegexFilter] = createSignal(new RegExp(""))
  const [regexCompileFailed, setRegexCompileFailed] = createSignal(false)
  createEffect(() => {
    try {
      setRegexFilter(new RegExp(regexFilterValue()))
      setRegexCompileFailed(false)
    } catch (_) {
      setRegexCompileFailed(true)
    }
  })

  const [showOnlyMine, setShowOnlyMine] = createSignal(me().role !== 2)
  const taskFilter = createMemo(() => {
    const regex = regexFilter()
    const mine = showOnlyMine()
    return (task: TaskInfo): boolean =>
      regex.test(task.name) && (!mine || task.creator === me().username)
  })
  const filteredTask = createMemo(() => {
    return tasks().filter(taskFilter())
  })

  const selectedIds = createMemo(() =>
    filteredTask()
      .filter((task) => task.local.selected)
      .map((task) => task.id),
  )

  const allSelected = createMemo(
    () =>
      filteredTask().length > 0 &&
      filteredTask().every((task) => task.local.selected),
  )
  const isIndeterminate = createMemo(
    () => filteredTask().some((task) => task.local.selected) && !allSelected(),
  )
  const selectAll = (v: boolean) =>
    setTasks(
      tasks().map((task) => {
        if (taskFilter()(task)) {
          return { ...task, local: { ...task.local, selected: v } }
        }
        return task
      }),
    )

  const allExpanded = createMemo(
    () =>
      filteredTask().length > 0 &&
      filteredTask().every((task) => task.local.expanded),
  )
  const expandAll = (v: boolean) =>
    setTasks(
      tasks().map((task) => {
        if (taskFilter()(task)) {
          return { ...task, local: { ...task.local, expanded: v } }
        }
        return task
      }),
    )

  const [retrySelectedLoading, retrySelected] = useFetch((): PEmptyResp =>
    r.post(`/task/${props.type}/retry_some`, selectedIds()),
  )
  const operateName = props.done === "undone" ? "cancel" : "delete"
  const [operateSelectedLoading, operateSelected] = useFetch((): PEmptyResp =>
    r.post(`/task/${props.type}/${operateName}_some`, selectedIds()),
  )
  const notifyIndividualError = (msg: Record<string, string>) => {
    if (!msg) return
    Object.entries(msg).forEach(([key, value]) => {
      notify.error(`${key}: ${value}`)
    })
  }

  const [page, setPage] = createSignal(1)
  const pageSize = 20
  const curTasks = createMemo(() => {
    const start = (page() - 1) * pageSize
    const end = start + pageSize
    return filteredTask().slice(start, end)
  })

  const toggleSort = (col: TaskOrderBy) => {
    if (orderBy() === col) {
      setOrderReverse(!orderReverse())
    } else {
      batch(() => {
        setOrderBy(col)
        setOrderReverse(false)
      })
    }
    refresh()
  }

  const getLocalSetter = (id: string) => {
    return (l: TaskLocal) =>
      setTasks(
        tasks().map((item) => (item.id === id ? { ...item, local: l } : item)),
      )
  }

  const sortFields = createMemo((): TaskOrderBy[] =>
    me().role === 2
      ? ["name", "creator", "state", "progress"]
      : ["name", "state", "progress"],
  )

  return (
    <section class="ol-admin-card">
      <div class="ol-admin-card__head">
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <span
            class="ol-status-dot"
            data-status={props.done === "undone" ? "info" : "work"}
          />
          <h3 class="ol-admin-card__title">{t(`tasks.${props.done}`)}</h3>
          <span class="ol-pill ol-tabular">{filteredTask().length}</span>
        </div>

        <div
          style={{
            display: "flex",
            "align-items": "center",
            "flex-wrap": "wrap",
            gap: "10px",
          }}
        >
          <Show when={me().role === 2}>
            <Checkbox
              checked={showOnlyMine()}
              onChange={(e: any) =>
                setShowOnlyMine(e.target.checked as boolean)
              }
            >
              {t("tasks.show_only_mine")}
            </Checkbox>
          </Show>
          <Button
            size="xs"
            colorScheme="neutral"
            onClick={() => expandAll(!allExpanded())}
            disabled={filteredTask().length === 0}
          >
            <Show
              when={allExpanded()}
              fallback={
                <TbChevronDown
                  size={13}
                  class="ol-ico"
                  style={{ "margin-right": "4px" }}
                />
              }
            >
              <TbChevronUp
                size={13}
                class="ol-ico"
                style={{ "margin-right": "4px" }}
              />
            </Show>
            {allExpanded() ? t("tasks.fold_all") : t("tasks.expand_all")}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div
        class="ol-admin-toolbar"
        style={{
          background: "var(--ol-surface-2)",
          "margin-bottom": "12px",
        }}
      >
        <div class="ol-admin-toolbar__left">
          <Checkbox
            disabled={filteredTask().length === 0}
            checked={allSelected()}
            indeterminate={isIndeterminate()}
            onChange={(e: any) => selectAll(e.target.checked as boolean)}
          />
          <div class="ol-admin-search">
            <TbSearch size={15} class="ol-ico" />
            <input
              type="search"
              placeholder={t("tasks.filter")}
              value={regexFilterValue()}
              onInput={(e) => setRegexFilterValue(e.currentTarget.value)}
              style={
                regexCompileFailed()
                  ? { "border-color": "var(--ol-danger)" }
                  : undefined
              }
            />
          </div>

          <div class="ol-admin-toolbar__group">
            <For each={sortFields()}>
              {(col) => {
                const active = () => orderBy() === col
                return (
                  <button
                    type="button"
                    class="ol-btn ol-btn--ghost"
                    style={{
                      height: "28px",
                      padding: "0 8px",
                      "font-size": "12px",
                      color: active()
                        ? "var(--ol-accent-text)"
                        : "var(--ol-text-muted)",
                    }}
                    onClick={() => toggleSort(col)}
                  >
                    <span>{t(`tasks.attr.${col}`)}</span>
                    <Show
                      when={active()}
                      fallback={<TbArrowsSort size={13} class="ol-ico" />}
                    >
                      <Show
                        when={orderReverse()}
                        fallback={<TbArrowUp size={13} class="ol-ico" />}
                      >
                        <TbArrowDown size={13} class="ol-ico" />
                      </Show>
                    </Show>
                  </button>
                )
              }}
            </For>
          </div>
        </div>

        <div class="ol-admin-toolbar__right">
          <Show when={props.done === "done"}>
            <Button
              size="sm"
              colorScheme="neutral"
              loading={loading()}
              onClick={refresh}
            >
              <TbRefresh
                size={14}
                class="ol-ico"
                style={{ "margin-right": "5px" }}
              />
              {t("global.refresh")}
            </Button>
            <Button
              size="sm"
              colorScheme="neutral"
              loading={retryFailedLoading()}
              onClick={async () => {
                const resp = await retryFailed()
                handleResp(resp, () => refresh())
              }}
            >
              <TbRotateClockwise
                size={14}
                class="ol-ico"
                style={{ "margin-right": "5px" }}
              />
              {t("tasks.retry_failed")}
            </Button>
            <Button
              size="sm"
              colorScheme="neutral"
              loading={clearSucceededLoading()}
              onClick={async () => {
                const resp = await clearSucceeded()
                handleResp(resp, () => refresh())
              }}
            >
              <TbCheck
                size={14}
                class="ol-ico"
                style={{ "margin-right": "5px" }}
              />
              {t("tasks.clear_succeeded")}
            </Button>
            <Button
              size="sm"
              colorScheme="danger"
              loading={clearDoneLoading()}
              onClick={async () => {
                const resp = await clearDone()
                handleResp(resp, () => refresh())
              }}
            >
              <TbTrash
                size={14}
                class="ol-ico"
                style={{ "margin-right": "5px" }}
              />
              {t("global.clear")}
            </Button>
          </Show>

          <Show when={props.canRetry}>
            <Button
              size="sm"
              colorScheme="primary"
              disabled={selectedIds().length === 0}
              loading={retrySelectedLoading()}
              onClick={async () => {
                const resp = await retrySelected()
                handleResp(resp, (data) => {
                  notifyIndividualError(data)
                  refresh()
                })
              }}
            >
              <TbRotateClockwise
                size={14}
                class="ol-ico"
                style={{ "margin-right": "5px" }}
              />
              {t("tasks.retry_selected")}
            </Button>
          </Show>

          <Button
            size="sm"
            colorScheme="danger"
            disabled={selectedIds().length === 0}
            loading={operateSelectedLoading()}
            onClick={async () => {
              const resp = await operateSelected()
              handleResp(resp, (data) => {
                notifyIndividualError(data)
                refresh()
              })
            }}
          >
            <Show
              when={operateName === "cancel"}
              fallback={
                <TbTrash
                  size={14}
                  class="ol-ico"
                  style={{ "margin-right": "5px" }}
                />
              }
            >
              <TbX size={14} class="ol-ico" style={{ "margin-right": "5px" }} />
            </Show>
            {t(`tasks.${operateName}_selected`)}
          </Button>
        </div>
      </div>

      {/* Task Items */}
      <Show
        when={curTasks().length > 0}
        fallback={
          <div class="ol-admin-empty">
            <TbSubtask size={22} class="ol-ico" />
            <span>
              {tasks().length === 0
                ? t("manage.common.no_data")
                : t("manage.common.no_results")}
            </span>
          </div>
        }
      >
        <div class="ol-admin-form-stack" style={{ gap: "8px" }}>
          <For each={curTasks()}>
            {(task) => (
              <Task {...task} {...props} setLocal={getLocalSetter(task.id)} />
            )}
          </For>
        </div>
      </Show>

      <Show when={filteredTask().length > pageSize}>
        <div
          class="ol-admin-card__foot"
          style={{ "justify-content": "center" }}
        >
          <Paginator
            total={filteredTask().length}
            defaultPageSize={pageSize}
            onChange={(p) => {
              setPage(p)
            }}
          />
        </div>
      </Show>
    </section>
  )
}

export const TypeTasks = (props: {
  type: string
  nameAnalyzer: TaskNameAnalyzer
  canRetry?: boolean
}) => {
  const t = useT()
  return (
    <div class="ol-admin-form-stack">
      <h2
        style={{
          margin: "2px 0 0",
          "font-size": "15px",
          "font-weight": "620",
          color: "var(--ol-text-primary)",
        }}
      >
        {t(`tasks.${props.type}`)}
      </h2>
      <For each={["undone", "done"]}>
        {(done) => (
          <Tasks
            type={props.type}
            done={done}
            canRetry={props.canRetry}
            nameAnalyzer={props.nameAnalyzer}
          />
        )}
      </For>
    </div>
  )
}
