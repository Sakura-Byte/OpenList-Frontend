import { useManageTitle, useT } from "~/hooks"
import Indexes from "./indexes"
import Scan from "./scan"

const IndexPage = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.indexes")

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.sidemenu.indexes")}</h1>
          <p class="ol-admin-subtitle">
            {t("indexes.index_header")} · {t("indexes.scan_header")}
          </p>
        </div>
      </div>
      <Indexes />
      <Scan />
    </div>
  )
}

export default IndexPage
