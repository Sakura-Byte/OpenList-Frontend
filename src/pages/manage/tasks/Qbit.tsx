import { useManageTitle, useT } from "~/hooks"
import {
  getOfflineDownloadNameAnalyzer,
  getOfflineDownloadTransferNameAnalyzer,
} from "./helper"
import { TypeTasks } from "./Tasks"
import { TasksShell } from "./TasksShell"

// deprecated
const Qbit = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.qbit")
  return (
    <TasksShell title={t("manage.sidemenu.tasks")}>
      <TypeTasks
        type="qbit_down"
        canRetry
        nameAnalyzer={getOfflineDownloadNameAnalyzer()}
      />
      <TypeTasks
        type="qbit_transfer"
        nameAnalyzer={getOfflineDownloadTransferNameAnalyzer()}
      />
    </TasksShell>
  )
}

export default Qbit
