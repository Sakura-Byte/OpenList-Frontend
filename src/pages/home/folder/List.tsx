import {
  For,
  Show,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from "solid-js"
import { IArrowDown, IArrowUp } from "~/components/icons-tb"
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
import { bus } from "~/utils"
import { ListItem } from "./ListItem"
import { SelectionBar } from "./SelectionBar"
import { useSelectWithMouse } from "./helper"

export interface SortState {
  orderBy: string
  reverse: boolean
}

const SORT_KEY_PREFIX = "dir_sort_"

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

  const visibleCount = createMemo(
    () => objStore.objs.filter((o) => !isHide(o)).length,
  )

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
        when={visibleCount() > 0}
        fallback={<div class="ol-empty">{t("home.empty_dir")}</div>}
      >
        <div class="ol-nav-body" role="listbox" aria-multiselectable="true">
          <For each={objStore.objs}>
            {(obj, i) => <ListItem obj={obj} index={i()} />}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default ListLayout
