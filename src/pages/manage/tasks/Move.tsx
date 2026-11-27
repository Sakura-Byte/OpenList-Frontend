import { useManageTitle, useT } from "~/hooks"
import { getPath } from "./helper"
import { TypeTasks } from "./Tasks"
import { TasksShell } from "./TasksShell"

const Move = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.move")
  return (
    <TasksShell title={t("manage.sidemenu.move")}>
      <TypeTasks
        type="move"
        canRetry
        nameAnalyzer={{
          regex:
            /^move \[(.*\/([^\/]*))]\((.*\/([^\/]*))\) to \[(.+)]\((.+)\)$/,
          title: (matches) => {
            if (matches[4] !== "") return matches[4]
            return matches[2] === "" ? "/" : matches[2]
          },
          attrs: {
            [t("tasks.attr.copy.src")]: (matches) =>
              getPath(matches[1], matches[3]),
            [t("tasks.attr.copy.dst")]: (matches) =>
              getPath(matches[5], matches[6]),
          },
        }}
      />
    </TasksShell>
  )
}

export default Move
