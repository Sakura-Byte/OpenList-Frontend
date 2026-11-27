import { TbBook2, TbBrandGithub, TbExternalLink } from "solid-icons/tb"
import { createResource } from "solid-js"
import { Markdown, MaybeLoading } from "~/components"
import { useManageTitle, useT } from "~/hooks"

const fetchReadme = async () =>
  await (
    await fetch(
      "https://raw.githubusercontent.com/OpenListTeam/OpenList/main/README.md",
    )
  ).text()

const About = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.about")
  const [readme] = createResource(fetchReadme)

  return (
    <div class="ol-admin-page">
      <div class="ol-admin-head">
        <div class="ol-admin-head__main">
          <h1 class="ol-admin-title">{t("manage.sidemenu.about")}</h1>
          <p class="ol-admin-subtitle">{t("manage.title")}</p>
        </div>
        <div class="ol-admin-head__actions">
          <a
            class="ol-btn"
            href="https://doc.oplist.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            <TbBook2 size={15} class="ol-ico" />
            <span>{t("manage.sidemenu.docs")}</span>
            <TbExternalLink size={13} class="ol-ico" />
          </a>
          <a
            class="ol-btn"
            href="https://github.com/OpenListTeam/OpenList"
            target="_blank"
            rel="noopener noreferrer"
          >
            <TbBrandGithub size={15} class="ol-ico" />
            <span>GitHub</span>
            <TbExternalLink size={13} class="ol-ico" />
          </a>
        </div>
      </div>

      <section class="ol-admin-card">
        <MaybeLoading loading={readme.loading}>
          <Markdown children={readme()} sanitize={true} />
        </MaybeLoading>
      </section>
    </div>
  )
}

export default About
