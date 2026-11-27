import { useManageTitle, useT } from "~/hooks"
import { getPath } from "./helper"
import { TypeTasks } from "./Tasks"
import { TasksShell } from "./TasksShell"

const Upload = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.upload")
  return (
    <TasksShell title={t("manage.sidemenu.upload")}>
      <TypeTasks
        type="upload"
        nameAnalyzer={{
          regex: /^upload (.+) to \[(.+)]\((.+)\)$/,
          title: (matches) => matches[1],
          attrs: {
            [t("tasks.attr.upload.path")]: (matches) =>
              getPath(matches[2], matches[3]),
          },
        }}
      />
    </TasksShell>
  )
}

export default Upload
