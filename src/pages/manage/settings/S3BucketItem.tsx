import { Button, FormControl, FormLabel, Input } from "@hope-ui/solid"
import { TbTrash } from "solid-icons/tb"
import { FolderChooseInput } from "~/components"
import { useT } from "~/hooks"

export type S3Bucket = {
  name: string
  path: string
}

type S3BucketItemProps = S3Bucket & {
  onChange: (val: S3Bucket) => void
  onDelete: () => void
}

export const S3BucketItem = (props: S3BucketItemProps) => {
  const t = useT()
  return (
    <div
      class="ol-admin-card"
      style={{
        background: "var(--ol-surface-2)",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "grid",
          "grid-template-columns":
            "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          gap: "12px 16px",
          "align-items": "end",
        }}
      >
        <FormControl w="100%" display="flex" flexDirection="column" required>
          <FormLabel>{t("global.name")}</FormLabel>
          <Input
            value={props.name}
            onInput={(e) =>
              props.onChange({ name: e.currentTarget.value, path: props.path })
            }
          />
        </FormControl>

        <FormControl w="100%" display="flex" flexDirection="column" required>
          <FormLabel>{t("metas.path")}</FormLabel>
          <FolderChooseInput
            value={props.path}
            onChange={(path) => props.onChange({ name: props.name, path })}
          />
        </FormControl>
      </div>

      <div
        style={{
          display: "flex",
          "justify-content": "flex-end",
          "margin-top": "10px",
        }}
      >
        <Button
          size="sm"
          colorScheme="danger"
          onClick={() => {
            props.onDelete()
          }}
        >
          <TbTrash size={14} class="ol-ico" style={{ "margin-right": "5px" }} />
          {t("global.delete")}
        </Button>
      </div>
    </div>
  )
}
