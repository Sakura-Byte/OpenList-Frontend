import { Show, createSignal, onCleanup } from "solid-js"
import { IArrowUp } from "~/components/icons-tb"

export const useScrollListener = (
  callback: (e?: Event) => void,
  options?: { immediate?: boolean },
) => {
  if (options?.immediate) callback()
  window.addEventListener("scroll", callback, { passive: true })
  onCleanup(() => window.removeEventListener("scroll", callback))
}

export const BackTop = () => {
  const [visible, setVisible] = createSignal(false)
  useScrollListener(() => setVisible(window.scrollY > 240))

  return (
    <Show when={visible()}>
      <button
        type="button"
        class="ol-fab-btn"
        aria-label="Back to top"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" })
        }}
      >
        <IArrowUp size={18} />
      </button>
    </Show>
  )
}
