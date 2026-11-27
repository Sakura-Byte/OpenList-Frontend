import { useManageTitle, useT } from "~/hooks"
import {
  getOfflineDownloadNameAnalyzer,
  getOfflineDownloadTransferNameAnalyzer,
} from "./helper"
import { TypeTasks } from "./Tasks"
import { TasksShell } from "./TasksShell"

// deprecated
const Aria2 = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.aria2")
  return (
    <TasksShell title={t("manage.sidemenu.tasks")}>
      <TypeTasks
        type="aria2_down"
        canRetry
        nameAnalyzer={getOfflineDownloadNameAnalyzer()}
      />
      <TypeTasks
        type="aria2_transfer"
        nameAnalyzer={getOfflineDownloadTransferNameAnalyzer()}
      />
    </TasksShell>
  )
}

export default Aria2
