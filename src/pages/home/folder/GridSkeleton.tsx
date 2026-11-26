import { For } from "solid-js"

const GridSkeleton = () => {
  return (
    <div class="ol-grid">
      <For each={Array.from({ length: 12 })}>
        {() => (
          <div class="ol-tile">
            <span
              class="ol-skeleton-bar"
              style={{
                width: "48px",
                height: "54px",
                "border-radius": "var(--ol-radius-sm)",
              }}
            />
            <span class="ol-skeleton-bar" style={{ width: "76%" }} />
          </div>
        )}
      </For>
    </div>
  )
}

export default GridSkeleton
