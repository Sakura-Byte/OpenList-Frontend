import { Box, Text } from "@hope-ui/solid"
import { createMemo, For } from "solid-js"
import { LinkWithBase } from "~/components"
import { useRouter } from "~/hooks"
import { objStore } from "~/store"
import { encodePath, pathJoin } from "~/utils"
import { useJMTranslation } from "./i18n"
import "./work-page.css"

export default function TagFolders() {
  const t = useJMTranslation()
  const { pathname } = useRouter()
  const tags = createMemo(() =>
    [...objStore.objs].sort(
      (a, b) =>
        (b.tag?.count ?? 0) - (a.tag?.count ?? 0) ||
        a.name.localeCompare(b.name),
    ),
  )
  return (
    <Box w="$full">
      <Text mb="$3">{t("tag_count_policy")}</Text>
      <div class="jm-tag-folders">
        <For each={tags()}>
          {(obj) => (
            <LinkWithBase
              class="jm-tag-folder"
              href={encodePath(pathJoin(pathname(), obj.name), true)}
            >
              <span>{obj.tag?.name ?? obj.name}</span>
              <span class="jm-tag-count">{obj.tag?.count ?? 0}</span>
            </LinkWithBase>
          )}
        </For>
      </div>
    </Box>
  )
}
