import { useManageTitle, useT } from "~/hooks"
import { getPath } from "./helper"
import { TypeTasks } from "./Tasks"
import { TasksShell } from "./TasksShell"

const Copy = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.copy")
  return (
    <TasksShell title={t("manage.sidemenu.copy")}>
      <TypeTasks
        type="copy"
        canRetry
        nameAnalyzer={{
          regex:
            /^(?:copy|merge) \[(.*\/([^\/]*))]\((.*\/([^\/]*))\) to \[(.+)]\((.+)\)$/,
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

export default Copy
