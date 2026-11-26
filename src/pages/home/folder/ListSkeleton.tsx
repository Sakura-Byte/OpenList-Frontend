import { For } from "solid-js"

const ListSkeleton = () => {
  const widths = ["52%", "68%", "44%", "61%", "39%", "57%", "48%", "64%"]
  return (
    <div>
      <For each={widths}>
        {(w) => (
          <div class="ol-skeleton-row">
            <span
              class="ol-skeleton-bar"
              style={{ width: "18px", height: "18px", margin: "0 auto" }}
            />
            <span class="ol-skeleton-bar" style={{ width: w }} />
            <span
              class="ol-skeleton-bar"
              style={{ width: "54px", "justify-self": "end" }}
            />
            <span
              class="ol-skeleton-bar"
              style={{ width: "108px", "justify-self": "end" }}
            />
          </div>
        )}
      </For>
    </div>
  )
}

export default ListSkeleton
