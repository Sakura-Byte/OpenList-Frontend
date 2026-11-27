import { useManageTitle, useT } from "~/hooks"
import {
  getOfflineDownloadNameAnalyzer,
  getOfflineDownloadTransferNameAnalyzer,
} from "./helper"
import { TypeTasks } from "./Tasks"
import { TasksShell } from "./TasksShell"

const OfflineDownload = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.offline_download")
  return (
    <TasksShell title={t("manage.sidemenu.offline_download")}>
      <TypeTasks
        type="offline_download"
        canRetry
        nameAnalyzer={getOfflineDownloadNameAnalyzer()}
      />
      <TypeTasks
        type="offline_download_transfer"
        canRetry
        nameAnalyzer={getOfflineDownloadTransferNameAnalyzer()}
      />
    </TasksShell>
  )
}

export default OfflineDownload
