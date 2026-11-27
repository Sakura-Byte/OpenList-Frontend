import { useManageTitle, useT } from "~/hooks"
import {
  getDecompressNameAnalyzer,
  getDecompressUploadNameAnalyzer,
} from "./helper"
import { TypeTasks } from "./Tasks"
import { TasksShell } from "./TasksShell"

const Decompress = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.decompress")
  return (
    <TasksShell title={t("manage.sidemenu.decompress")}>
      <TypeTasks
        type="decompress"
        canRetry
        nameAnalyzer={getDecompressNameAnalyzer()}
      />
      <TypeTasks
        type="decompress_upload"
        canRetry
        nameAnalyzer={getDecompressUploadNameAnalyzer()}
      />
    </TasksShell>
  )
}

export default Decompress
