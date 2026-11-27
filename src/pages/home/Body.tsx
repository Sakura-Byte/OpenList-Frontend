import { clsx } from "clsx"
import {
  For,
  JSX,
  Show,
  createMemo,
  createResource,
  createSignal,
  on,
} from "solid-js"
import { LinkWithBase, Markdown } from "~/components"
import {
  IAlert,
  ICheck,
  IClose,
  ICopy,
  IInfo,
  IKey,
  IMegaphone,
} from "~/components/icons-tb"
import { useLink, useRouter, useT } from "~/hooks"
import {
  State,
  dismissNoticeBanner,
  getActiveBannerNoticeForPath,
  getPromotionsForSlot,
  getSetting,
  getSettingBool,
  objStore,
  openNoticeModalManual,
} from "~/store"
import { fetchText } from "~/utils"
import { Nav } from "./Nav"
import { Obj } from "./Obj"
import { Readme, hasActiveReadmeForCurrentView } from "./Readme"
import { Sidebar } from "./Sidebar"
import { Header } from "./header/Header"

const SOURCE_TOKEN_RE =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>]+)/g

function trimBareUrlTrailingPunct(rawUrl: string): {
  url: string
  trailing: string
} {
  const m = rawUrl.match(/^(.*?)([.,;:!?，。；：！？]+)$/)
  if (!m) return { url: rawUrl, trailing: "" }
  return { url: m[1], trailing: m[2] }
}

export function renderSourceNoteNodes(note: string): JSX.Element[] {
  const out: JSX.Element[] = []
  if (!note) return out

  let lastIndex = 0
  SOURCE_TOKEN_RE.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = SOURCE_TOKEN_RE.exec(note)) !== null) {
    if (match.index > lastIndex) {
      out.push(note.slice(lastIndex, match.index))
    }
    if (match[1] && match[2]) {
      out.push(
        <a
          class="ol-fact__link"
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[1]}
        </a>,
      )
    } else if (match[3]) {
      const { url, trailing } = trimBareUrlTrailingPunct(match[3])
      out.push(
        <a
          class="ol-fact__link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {url}
        </a>,
      )
      if (trailing) {
        out.push(trailing)
      }
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < note.length) {
    out.push(note.slice(lastIndex))
  }
  return out
}

export const Body = () => {
  const t = useT()
  const { pathname, isShare, searchParams } = useRouter()
  const { proxyLink } = useLink()

  const [noticeClosing, setNoticeClosing] = createSignal(false)
  const [copiedPw, setCopiedPw] = createSignal<string | null>(null)

  const bannerNotice = createMemo(() =>
    getActiveBannerNoticeForPath(pathname()),
  )

  const headerAds = createMemo(() =>
    getPromotionsForSlot("header_banner", pathname()),
  )
  const readmeSponsorAds = createMemo(() =>
    getPromotionsForSlot("readme_sponsor", pathname()),
  )
  const adRecruitAds = createMemo(() =>
    getPromotionsForSlot("ad_recruit", pathname()),
  )
  const subdirSponsorPromos = createMemo(() =>
    getPromotionsForSlot("subdir_sponsor", pathname()),
  )

  const copyPassword = async (pw: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pw)
      } else {
        const input = document.createElement("textarea")
        input.value = pw
        input.style.position = "fixed"
        input.style.opacity = "0"
        document.body.appendChild(input)
        input.select()
        document.execCommand("copy")
        document.body.removeChild(input)
      }
    } catch {
      /* ignore clipboard restrictions */
    }
    setCopiedPw(pw)
    window.setTimeout(() => {
      setCopiedPw((cur) => (cur === pw ? null : cur))
    }, 1600)
  }

  const headerSource = createMemo(
    on(
      () =>
        [
          objStore.state,
          objStore.header,
          objStore.reader,
          searchParams.view,
        ] as const,
      () => {
        if (
          ![State.FetchingMore, State.Folder, State.File].includes(
            objStore.state,
          )
        ) {
          return ""
        }
        if (
          getSettingBool("readme_autorender") &&
          [State.FetchingMore, State.Folder].includes(objStore.state) &&
          !(objStore.reader && searchParams.view !== "files")
        ) {
          const headerFiles = ["header.md", "top.md", "index.md"]
          const found = objStore.objs.find((item) =>
            headerFiles.some(
              (f) => f.toLowerCase() === item.name.toLowerCase(),
            ),
          )
          if (found) {
            return proxyLink(found, true)
          }
        }
        return (objStore.header || "").trim()
      },
    ),
  )

  const [headerContent] = createResource(headerSource, async (src) => {
    if (!src) return ""
    if (/^https?:\/\//i.test(src)) {
      const res = await fetchText(src)
      return res.content
    }
    return src
  })

  const showFacts = createMemo(
    () =>
      [State.Folder, State.FetchingMore].includes(objStore.state) &&
      ((objStore.archive_passwords?.length ?? 0) > 0 ||
        Boolean(objStore.source_note?.trim())),
  )

  const hasCurrentReadme = hasActiveReadmeForCurrentView([
    "readme.md",
    "footer.md",
    "bottom.md",
  ])

  const subdirSponsorData = createMemo(() => {
    if (isShare() || pathname() === "/" || hasCurrentReadme()) return null
    if (![State.Folder, State.FetchingMore].includes(objStore.state))
      return null
    const promo = subdirSponsorPromos()[0]
    if (promo) {
      return {
        title: promo.title || t("home.subdir_sponsor.default_title"),
        desc:
          promo.subtitle || promo.body || t("home.subdir_sponsor.default_desc"),
        ctaText: promo.cta_text || t("home.subdir_sponsor.default_cta"),
        ctaUrl: promo.cta_url || "/#sponsor",
        trackName: promo.track_name || "subdir_sponsor",
        trackPiece: promo.track_piece || promo.title || String(promo.id),
      }
    }
    if (!getSettingBool("subdir_sponsor_enabled")) return null
    return {
      title:
        getSetting("subdir_sponsor_title") ||
        t("home.subdir_sponsor.default_title"),
      desc:
        getSetting("subdir_sponsor_desc") ||
        t("home.subdir_sponsor.default_desc"),
      ctaText:
        getSetting("subdir_sponsor_cta_text") ||
        t("home.subdir_sponsor.default_cta"),
      ctaUrl: getSetting("subdir_sponsor_cta_url") || "/#sponsor",
      trackName: "subdir_sponsor",
      trackPiece: "subdir-sponsor-default",
    }
  })

  return (
    <div
      class="body"
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "14px",
        width: "100%",
      }}
    >
      <section class="ol-sheet">
        <Header />

        <Show when={bannerNotice()}>
          {(n) => (
            <div class="ol-collapse" data-closing={noticeClosing()}>
              <div class="ol-notice" data-severity={n().severity} role="status">
                <span class="ol-notice__icon">
                  {n().severity === "critical" ? (
                    <IMegaphone size={16} />
                  ) : n().severity === "warning" ? (
                    <IAlert size={16} />
                  ) : (
                    <IInfo size={16} />
                  )}
                </span>
                <span class="ol-notice__text">
                  <Show when={n().title}>
                    <b>{n().title}</b>
                  </Show>
                  {n().summary ||
                    (!n().title ? t("home.notice.site_announcement") : "")}
                </span>
                <button
                  type="button"
                  class="ol-link-btn"
                  style={{ "font-size": "13px", "flex-shrink": 0 }}
                  onClick={() => openNoticeModalManual(n())}
                >
                  {t("home.notice.details")}
                </button>
                <button
                  type="button"
                  class="ol-icon-btn"
                  title={t("home.notice.dismiss")}
                  aria-label={t("home.notice.dismiss")}
                  onClick={() => {
                    const target = n()
                    setNoticeClosing(true)
                    window.setTimeout(() => {
                      dismissNoticeBanner(target)
                      setNoticeClosing(false)
                    }, 200)
                  }}
                >
                  <IClose size={14} />
                </button>
              </div>
            </div>
          )}
        </Show>

        <Nav />

        <Show when={showFacts()}>
          <div class="ol-facts">
            <Show when={(objStore.archive_passwords?.length ?? 0) > 0}>
              <span class="ol-fact">
                <span class="ol-fact__label">
                  {t("home.facts.archive_password")}
                </span>
                <For each={objStore.archive_passwords}>
                  {(pw) => (
                    <button
                      type="button"
                      class="ol-pw"
                      data-copied={copiedPw() === pw}
                      title={t("home.facts.copy_password")}
                      onClick={() => copyPassword(pw)}
                    >
                      <IKey size={13} />
                      <span>{pw}</span>
                      {copiedPw() === pw ? (
                        <ICheck size={13} />
                      ) : (
                        <ICopy size={13} />
                      )}
                    </button>
                  )}
                </For>
              </span>
            </Show>
            <Show when={objStore.source_note?.trim()}>
              <span class="ol-fact">
                <span class="ol-fact__label">{t("home.facts.source")}</span>
                <span>{renderSourceNoteNodes(objStore.source_note)}</span>
              </span>
            </Show>
          </div>
        </Show>

        <Show when={headerSource() && headerContent()}>
          <div class="ol-dir-tip">
            <IInfo size={15} class="ol-dir-tip__icon" />
            <div class="ol-dir-tip__body">
              <Markdown
                children={headerContent()}
                readme
                trackContent
                contentName="Home Top Description"
                contentPiece="home-top-description"
              />
            </div>
          </div>
        </Show>

        <Show when={headerAds().length > 0}>
          <div
            class={clsx(
              "ol-adslot",
              headerAds().length === 1 && "ol-adslot--single",
            )}
            data-nosnippet
          >
            <For each={headerAds()}>
              {(ad) => (
                <a
                  class="ol-adslot__item"
                  href={ad.cta_url || "#"}
                  target="_blank"
                  rel="noopener sponsored"
                  referrerpolicy="strict-origin-when-cross-origin"
                  data-track-content=""
                  data-content-name={ad.track_name || "header_banner"}
                  data-content-piece={
                    ad.track_piece || ad.title || `promo-${ad.id}`
                  }
                >
                  <Show when={ad.image}>
                    <img
                      class="ol-adslot__img"
                      src={ad.image}
                      alt=""
                      loading="lazy"
                    />
                  </Show>
                  <span class="ol-adslot__text">
                    <span class="ol-adslot__head">
                      <span class="ol-adslot__title">{ad.title}</span>
                      <span class="ol-ad-label">{t("home.ad_label")}</span>
                    </span>
                    <Show when={ad.subtitle || ad.body}>
                      <span class="ol-adslot__desc">
                        {ad.subtitle || ad.body}
                      </span>
                    </Show>
                  </span>
                </a>
              )}
            </For>
          </div>
        </Show>

        <Obj />
      </section>

      <Readme
        files={["readme.md", "footer.md", "bottom.md"]}
        fromMeta="readme"
      />

      <Show when={subdirSponsorData()}>
        {(s) => (
          <section
            class="ol-sheet ol-subdir-sponsor"
            data-nosnippet
            data-track-content=""
            data-content-name={s().trackName}
            data-content-piece={s().trackPiece}
          >
            <div class="ol-subdir-sponsor__info">
              <span class="ol-subdir-sponsor__title">{s().title}</span>
              <span class="ol-subdir-sponsor__desc">{s().desc}</span>
            </div>
            <Show
              when={s().ctaUrl.startsWith("/")}
              fallback={
                <a
                  class="ol-btn ol-btn--primary"
                  href={s().ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s().ctaText}
                </a>
              }
            >
              <LinkWithBase class="ol-btn ol-btn--primary" href={s().ctaUrl}>
                {s().ctaText}
              </LinkWithBase>
            </Show>
          </section>
        )}
      </Show>

      <Show when={readmeSponsorAds().length > 0 || adRecruitAds().length > 0}>
        <div class="ol-promo-stack" data-nosnippet>
          <Show when={readmeSponsorAds().length > 0}>
            <div
              class={clsx(
                "ol-promo-grid",
                readmeSponsorAds().length === 1 && "ol-promo-grid--single",
              )}
            >
              <For each={readmeSponsorAds()}>
                {(ad) => (
                  <a
                    class="ol-promo-card ol-promo-banner"
                    href={ad.cta_url || "#"}
                    target="_blank"
                    rel="noopener sponsored"
                    referrerpolicy="strict-origin-when-cross-origin"
                    data-track-content=""
                    data-content-name={ad.track_name || "readme_sponsor"}
                    data-content-piece={
                      ad.track_piece || ad.title || `promo-${ad.id}`
                    }
                  >
                    <Show when={ad.image}>
                      <div class="ol-promo-banner__media">
                        <img
                          class="ol-promo-banner__img"
                          src={ad.image}
                          alt=""
                          loading="lazy"
                        />
                      </div>
                    </Show>
                    <div class="ol-promo-banner__bar">
                      <div class="ol-promo-banner__meta">
                        <span class="ol-promo-banner__title">{ad.title}</span>
                        <Show when={ad.subtitle || ad.body}>
                          <span class="ol-promo-banner__desc">
                            {ad.subtitle || ad.body}
                          </span>
                        </Show>
                      </div>
                      <span class="ol-ad-label">{t("home.ad_label")}</span>
                    </div>
                  </a>
                )}
              </For>
            </div>
          </Show>
          <For each={adRecruitAds()}>
            {(ad) => {
              const content = (
                <>
                  <Show
                    when={ad.image}
                    fallback={
                      <span class="ol-adslot__img ol-adslot__img--placeholder">
                        600 × 300
                      </span>
                    }
                  >
                    <img
                      class="ol-adslot__img"
                      src={ad.image}
                      alt=""
                      loading="lazy"
                    />
                  </Show>
                  <span class="ol-adslot__text">
                    <span class="ol-adslot__title">{ad.title}</span>
                    <Show when={ad.subtitle || ad.body}>
                      <span class="ol-adslot__desc">
                        {[ad.subtitle, ad.body].filter(Boolean).join(" ")}
                      </span>
                    </Show>
                  </span>
                  <span class="ol-ad-label">{t("home.ad_label")}</span>
                </>
              )
              return (
                <div class="ol-promo-card ol-promo-card--recruit">
                  <Show
                    when={ad.cta_url}
                    fallback={
                      <div
                        class="ol-adslot__item"
                        data-track-content=""
                        data-content-name={ad.track_name || "ad_recruit"}
                        data-content-piece={
                          ad.track_piece || ad.title || `promo-${ad.id}`
                        }
                      >
                        {content}
                      </div>
                    }
                  >
                    <a
                      class="ol-adslot__item"
                      href={ad.cta_url}
                      target="_blank"
                      rel="noopener sponsored"
                      data-track-content=""
                      data-content-name={ad.track_name || "ad_recruit"}
                      data-content-piece={
                        ad.track_piece || ad.title || `promo-${ad.id}`
                      }
                    >
                      {content}
                    </a>
                  </Show>
                </div>
              )
            }}
          </For>
        </div>
      </Show>

      <Sidebar />
    </div>
  )
}
