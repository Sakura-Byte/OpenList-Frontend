import { Button } from "@hope-ui/solid"
import { TbDatabase, TbPlus } from "solid-icons/tb"
import { Index, Show } from "solid-js"
import { SetStoreFunction } from "solid-js/store"
import { useT } from "~/hooks"
import { SettingItem } from "~/types"
import { S3Bucket, S3BucketItem } from "./S3BucketItem"

export type S3BucketsProps = {
  buckets: S3Bucket[]
  setSettings: SetStoreFunction<SettingItem[]>
}

const S3Buckets = (props: S3BucketsProps) => {
  const t = useT()

  const addBucket = () => {
    props.setSettings(
      (i) => i.key === "s3_buckets",
      "value",
      JSON.stringify([...props.buckets, { name: "", path: "" }]),
    )
  }

  return (
    <section class="ol-admin-card">
      <div class="ol-admin-card__head">
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <TbDatabase size={17} class="ol-ico" />
          <h2 class="ol-admin-card__title">{t("settings.s3_buckets")}</h2>
          <span class="ol-pill ol-tabular">{props.buckets.length}</span>
        </div>
        <Button size="sm" colorScheme="neutral" onClick={addBucket}>
          <TbPlus size={15} class="ol-ico" style={{ "margin-right": "5px" }} />
          {t("global.add")}
        </Button>
      </div>

      <Show
        when={props.buckets.length > 0}
        fallback={
          <div class="ol-admin-empty">
            <span>{t("manage.common.no_data")}</span>
          </div>
        }
      >
        <div class="ol-admin-form-stack">
          <Index each={props.buckets}>
            {(item, index) => (
              <S3BucketItem
                {...item()}
                onChange={(val) => {
                  props.setSettings(
                    (i) => i.key === "s3_buckets",
                    "value",
                    JSON.stringify(
                      props.buckets.map((b, idx) => (idx === index ? val : b)),
                    ),
                  )
                }}
                onDelete={() => {
                  props.setSettings(
                    (i) => i.key === "s3_buckets",
                    "value",
                    JSON.stringify(
                      props.buckets.filter((_, idx) => idx !== index),
                    ),
                  )
                }}
              />
            )}
          </Index>
        </div>
      </Show>
    </section>
  )
}

export default S3Buckets
