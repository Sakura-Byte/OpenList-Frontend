import { createWindowVirtualizer } from "@tanstack/solid-virtual"
import {
  For,
  Show,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js"
import { IArrowDown, IArrowUp } from "~/components/icons-tb"
import "~/components/ui/ui.css"
import { useRouter, useT, useUtil } from "~/hooks"
import {
  OrderBy,
  allChecked,
  checkboxOpen,
  haveSelected,
  objStore,
  selectAll,
  sortObjs,
} from "~/store"
import { StoreObj } from "~/types"
import { bus } from "~/utils"
import { ListItem } from "./ListItem"
import { SelectionBar } from "./SelectionBar"
import { useSelectWithMouse } from "./helper"

export interface SortState {
  orderBy: string
  reverse: boolean
}

const SORT_KEY_PREFIX = "dir_sort_"
const VIRTUALIZE_THRESHOLD = 100
const VIRTUAL_OVERSCAN = 12

export function saveSortState(dir: string, state: SortState) {
  try {
    localStorage.setItem(`${SORT_KEY_PREFIX}${dir}`, JSON.stringify(state))
  } catch (err) {
    console.warn("failed to save sort config:", err)
  }
}

export function loadSortState(dir: string): SortState | null {
  try {
    const item = localStorage.getItem(`${SORT_KEY_PREFIX}${dir}`)
    if (!item) return null
    return JSON.parse(item) as SortState
  } catch (err) {
    console.warn("failed to read sort config:", err)
    return null
  }
}

export const ListTitle = (props: {
  sortCallback: (orderBy: OrderBy, reverse?: boolean) => void
  disableCheckbox?: boolean
  initialOrder?: OrderBy
  initialReverse?: boolean
}) => {
  const t = useT()
  const { pathname } = useRouter()

  const [orderBy, setOrderBy] = createSignal<OrderBy | undefined>(
    props.initialOrder,
  )
  const [reverse, setReverse] = createSignal(props.initialReverse ?? false)

  createEffect(() => {
    if (props.initialOrder !== undefined) {
      setOrderBy(props.initialOrder)
      setReverse(props.initialReverse ?? false)
    }
  })

  createEffect(() => {
    if (orderBy()) {
      saveSortState(pathname(), { orderBy: orderBy()!, reverse: reverse() })
      props.sortCallback(orderBy()!, reverse())
    }
  })

  const toggleSort = (col: OrderBy) => {
    if (orderBy() === col) {
      setReverse(!reverse())
    } else {
      batch(() => {
        setOrderBy(col)
        setReverse(col !== "name")
      })
    }
  }

  return (
    <div class="ol-list__head title">
      <span class="ol-row__check">
        <Show when={!props.disableCheckbox}>
          <input
            type="checkbox"
            class="ol-checkbox"
            style={{ opacity: 0.65 }}
            aria-label={t("home.selbar.select_all")}
            checked={allChecked()}
            onChange={(e) => selectAll(e.currentTarget.checked)}
          />
        </Show>
      </span>
      <button
        type="button"
        class="ol-sort"
        data-active={orderBy() === "name"}
        onClick={() => toggleSort("name")}
      >
        {t("home.obj.name")}
        <Show when={orderBy() === "name"}>
          {reverse() ? <IArrowDown size={12} /> : <IArrowUp size={12} />}
        </Show>
      </button>
      <button
        type="button"
        class="ol-sort ol-sort--end"
        data-active={orderBy() === "size"}
        onClick={() => toggleSort("size")}
      >
        {t("home.obj.size")}
        <Show when={orderBy() === "size"}>
          {reverse() ? <IArrowDown size={12} /> : <IArrowUp size={12} />}
        </Show>
      </button>
      <button
        type="button"
        class="ol-sort ol-sort--end ol-col-date"
        data-active={orderBy() === "modified"}
        onClick={() => toggleSort("modified")}
      >
        {t("home.obj.modified")}
        <Show when={orderBy() === "modified"}>
          {reverse() ? <IArrowDown size={12} /> : <IArrowUp size={12} />}
        </Show>
      </button>
    </div>
  )
}

interface VisibleRowEntry {
  obj: StoreObj
  index: number
}

const VirtualizedRows = (props: { rows: VisibleRowEntry[] }) => {
  let listRef: HTMLDivElement | undefined
  const [scrollMargin, setScrollMargin] = createSignal(0)

  const updateScrollMargin = () => {
    if (!listRef || typeof window === "undefined") return
    const next = Math.max(
      0,
      Math.round(listRef.getBoundingClientRect().top + window.scrollY),
    )
    if (next !== scrollMargin()) {
      setScrollMargin(next)
    }
  }

  onMount(() => {
    updateScrollMargin()
    window.addEventListener("resize", updateScrollMargin, { passive: true })

    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateScrollMargin())
      const sheet = listRef?.closest(".ol-sheet") ?? document.body
      ro.observe(sheet)
    }

    onCleanup(() => {
      window.removeEventListener("resize", updateScrollMargin)
      ro?.disconnect()
    })
  })

  createEffect(() => {
    haveSelected()
    props.rows.length
    queueMicrotask(updateScrollMargin)
  })

  const estimateRowHeight = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 640) {
      return 48
    }
    return 46
  }

  const virtualizer = createWindowVirtualizer({
    get count() {
      return props.rows.length
    },
    indexAttribute: "data-vindex",
    estimateSize: estimateRowHeight,
    overscan: VIRTUAL_OVERSCAN,
    get scrollMargin() {
      return scrollMargin()
    },
  })

  return (
    <div
      ref={listRef}
      class="ol-nav-body ol-virtual-list"
      role="listbox"
      aria-multiselectable="true"
      data-virtualized="true"
      style={{
        height: `${virtualizer.getTotalSize()}px`,
      }}
    >
      <For each={virtualizer.getVirtualItems()}>
        {(vItem) => {
          const entry = () => props.rows[vItem.index]
          return (
            <Show when={entry()}>
              {(row) => (
                <div
                  class="ol-virtual-row"
                  data-vindex={vItem.index}
                  data-last={vItem.index === props.rows.length - 1}
                  ref={(el) =>
                    queueMicrotask(() => virtualizer.measureElement(el))
                  }
                  style={{
                    transform: `translateY(${vItem.start - scrollMargin()}px)`,
                  }}
                >
                  <ListItem obj={row().obj} index={row().index} />
                </div>
              )}
            </Show>
          )
        }}
      </For>
    </div>
  )
}

const ListLayout = () => {
  const t = useT()
  const { pathname } = useRouter()
  const { isHide } = useUtil()

  const [initialOrder, setInitialOrder] = createSignal<OrderBy>()
  const [initialReverse, setInitialReverse] = createSignal(false)

  const { registerSelectContainer, captureContentMenu } = useSelectWithMouse()
  registerSelectContainer()

  onMount(() => {
    const saved = loadSortState(pathname())
    if (saved) {
      setInitialOrder(saved.orderBy as OrderBy)
      setInitialReverse(saved.reverse)
      sortObjs(saved.orderBy as OrderBy, saved.reverse)
    }
  })

  const onDragOver = (e: DragEvent) => {
    const items = Array.from(e.dataTransfer?.items ?? [])
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        bus.emit("tool", "upload")
        e.preventDefault()
        break
      }
    }
  }

  const visibleRows = createMemo<VisibleRowEntry[]>(() => {
    const out: VisibleRowEntry[] = []
    const all = objStore.objs
    for (let i = 0; i < all.length; i++) {
      const obj = all[i]
      if (!isHide(obj)) {
        out.push({ obj, index: i })
      }
    }
    return out
  })

  return (
    <div
      onDragOver={onDragOver}
      oncapture:contextmenu={captureContentMenu}
      class="ol-list list viselect-container"
      data-selecting={haveSelected() || checkboxOpen()}
    >
      <Show
        when={haveSelected()}
        fallback={
          <ListTitle
            sortCallback={sortObjs}
            initialOrder={initialOrder()}
            initialReverse={initialReverse()}
          />
        }
      >
        <SelectionBar />
      </Show>

      <Show
        when={visibleRows().length > 0}
        fallback={<div class="ol-empty">{t("home.empty_dir")}</div>}
      >
        <Show
          when={visibleRows().length > VIRTUALIZE_THRESHOLD}
          fallback={
            <div class="ol-nav-body" role="listbox" aria-multiselectable="true">
              <For each={visibleRows()}>
                {(row) => <ListItem obj={row.obj} index={row.index} />}
              </For>
            </div>
          }
        >
          <VirtualizedRows rows={visibleRows()} />
        </Show>
      </Show>
    </div>
  )
}

export default ListLayout
