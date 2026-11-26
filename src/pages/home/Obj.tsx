import { Button, Text } from "@hope-ui/solid"
import {
  Match,
  Show,
  Suspense,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  lazy,
  on,
} from "solid-js"
import { Error, FullLoading, LinkWithBase } from "~/components"
import { useObjTitle, usePath, useRouter, useT, useUtil } from "~/hooks"
import {
  State,
  getPagination,
  getSetting,
  layout,
  me,
  objStore,
  password,
  recordHistory,
  setPassword,
} from "~/store"
import { UserMethods } from "~/types"
import { encodePath, getFileSize, joinBase } from "~/utils"
import {
  buildBreadcrumbJsonLd,
  isJMComicEphemeralPath,
  resolveAbsoluteUrl,
  setCanonicalLink,
  setDescriptionMeta,
  setJsonLd,
  setOpenGraphMeta,
  setRobotsMeta,
  stripPlainTextForSeo,
} from "~/utils/seo"
import GridSkeleton from "./folder/GridSkeleton"
import ListSkeleton from "./folder/ListSkeleton"

const Folder = lazy(() => import("./folder/Folder"))
const JMComicView = lazy(() => import("./jmcomic/JMComicView"))
const File = lazy(() => import("./file/File"))
const Password = lazy(() => import("./Password"))

const [objBoxRef, setObjBoxRef] = createSignal<HTMLDivElement>()
export { objBoxRef }

export const Obj = () => {
  const t = useT()
  const { isHide } = useUtil()
  const { pathname, searchParams, isShare, to } = useRouter()
  const { handlePathChange, refresh } = usePath()
  const pagination = getPagination()
  const page = createMemo(() => {
    return pagination.type === "pagination"
      ? parseInt(searchParams["page"], 10) || 1
      : undefined
  })
  let lastPathname: string
  let lastPage: number | undefined
  createEffect(
    on([pathname, page], async ([pathname, page]) => {
      if (searchParams["pwd"]) {
        setPassword(searchParams["pwd"])
      }
      if (lastPathname) {
        recordHistory(lastPathname, lastPage)
      }
      lastPathname = pathname
      lastPage = page
      useObjTitle()
      await handlePathChange(pathname, page)
    }),
  )

  createEffect(() => {
    const err = objStore.err
    const state = objStore.state
    const currentPath = pathname()
    const view = searchParams["view"]

    if (Boolean(err) || state === State.NeedPassword) {
      setRobotsMeta("noindex")
      setCanonicalLink(null)
      setDescriptionMeta(null)
      setOpenGraphMeta(null)
      setJsonLd(null)
      return
    }
    if (
      view === "reader" ||
      view === "files" ||
      isJMComicEphemeralPath(currentPath)
    ) {
      setRobotsMeta("noindex, follow")
      setCanonicalLink(null)
      setOpenGraphMeta(null)
      setJsonLd(null)
      return
    }
    if (state === State.Folder || state === State.File) {
      setRobotsMeta(null)
      const canonicalRel = joinBase(encodePath(currentPath, true))
      setCanonicalLink(canonicalRel)

      // JMComicView updates its own specialized SEO once manifest loads
      if (state === State.Folder && objStore.reader) {
        return
      }

      const siteTitle = getSetting("site_title") || "OpenList"
      const pathSegs = currentPath.split("/").filter(Boolean)
      const leafName =
        state === State.File
          ? objStore.obj.name || pathSegs[pathSegs.length - 1] || siteTitle
          : pathSegs[pathSegs.length - 1] || siteTitle
      const pageTitle =
        currentPath === "/" ? siteTitle : `${leafName} | ${siteTitle}`

      // 4-Tier Ad-Free Client Description (never reads notices or promotions)
      let desc = ""
      const asmr =
        objStore.dir_info?.extra?.asmrone_work ??
        objStore.dir_info?.asmrone_work
      if (asmr && (asmr.title || asmr.source_id)) {
        desc = [
          asmr.source_id,
          asmr.circle,
          asmr.vas?.length ? asmr.vas.join(" / ") : "",
          stripPlainTextForSeo(asmr.introduction || "", 100),
        ]
          .filter(Boolean)
          .join(" · ")
      }

      if (!desc) {
        const metaParts = [
          stripPlainTextForSeo(objStore.source_note || "", 80),
          stripPlainTextForSeo(objStore.header || "", 120),
          stripPlainTextForSeo(objStore.readme || "", 140),
        ].filter(Boolean)
        if (metaParts.length > 0) {
          desc = stripPlainTextForSeo(metaParts.join(" · "), 160)
        }
      }

      if (!desc) {
        if (state === State.File) {
          desc = [
            objStore.obj.name,
            objStore.obj.size > 0 ? getFileSize(objStore.obj.size) : "",
            siteTitle,
          ]
            .filter(Boolean)
            .join(" · ")
        } else {
          const visible = objStore.objs.filter((o) => !isHide(o))
          if (visible.length > 0) {
            const folders = visible.filter((o) => o.is_dir).length
            const files = visible.length - folders
            const sampleNames = visible
              .slice(0, 3)
              .map((o) => o.name)
              .join("、")
            desc = stripPlainTextForSeo(
              `${leafName} · ${t("home.crumbs_count", { count: String(visible.length) })} (${folders}/${files})：${sampleNames}`,
              160,
            )
          }
        }
      }

      if (!desc) {
        desc =
          stripPlainTextForSeo(getSetting("site_description") || "", 160) ||
          siteTitle
      }

      const coverImg = asmr?.cover || objStore.dir_info?.cover || null

      setDescriptionMeta(desc)
      setOpenGraphMeta({
        title: pageTitle,
        description: desc,
        url: canonicalRel,
        type: state === State.File ? "article" : "website",
        siteName: siteTitle,
        image: coverImg,
      })
      setJsonLd({
        "@context": "https://schema.org",
        "@graph": [
          buildBreadcrumbJsonLd(currentPath, siteTitle, (p) =>
            joinBase(encodePath(p, true)),
          ),
          state === State.File
            ? {
                "@type": "DigitalDocument",
                name: objStore.obj.name || leafName,
                description: desc,
                url: resolveAbsoluteUrl(canonicalRel),
              }
            : {
                "@type": "CollectionPage",
                name: pageTitle,
                description: desc,
                url: resolveAbsoluteUrl(canonicalRel),
              },
        ],
      })
    }
  })

  const isStorageError = createMemo(() => {
    const err = objStore.err
    return (
      err.includes("storage not found") || err.includes("please add a storage")
    )
  })

  const shouldShowStorageButton = createMemo(() => {
    return isStorageError() && UserMethods.is_admin(me())
  })

  const storageErrorActions = () => (
    <Button colorScheme="accent" onClick={() => to("/@manage/storages")}>
      {t("global.go_to_storages")}
    </Button>
  )

  return (
    <div
      ref={(el: HTMLDivElement) => setObjBoxRef(el)}
      class="obj-box ol-obj-wrap"
    >
      <Suspense fallback={<ListSkeleton />}>
        <Switch>
          <Match when={objStore.err}>
            <div style={{ padding: "24px 16px" }}>
              <Error
                msg={objStore.err}
                disableColor
                show404Face={
                  isShare() && objStore.err === t("shares.share_gone")
                }
                actions={
                  shouldShowStorageButton() ? storageErrorActions() : undefined
                }
              />
            </div>
          </Match>
          <Match
            when={[State.FetchingObj, State.FetchingObjs].includes(
              objStore.state,
            )}
          >
            <Show when={layout() === "list"} fallback={<GridSkeleton />}>
              <ListSkeleton />
            </Show>
          </Match>
          <Match when={objStore.state === State.NeedPassword}>
            <div style={{ padding: "24px 16px" }}>
              <Password
                title={
                  isShare()
                    ? t("shares.input_password")
                    : t("home.input_password")
                }
                password={password}
                setPassword={setPassword}
                enterCallback={() => refresh(true)}
              >
                <Show when={!isShare()}>
                  <Text>{t("global.have_account")}</Text>
                  <Text
                    color="$info9"
                    as={LinkWithBase}
                    href={`/@login?redirect=${encodeURIComponent(
                      location.pathname,
                    )}`}
                  >
                    {t("global.go_login")}
                  </Text>
                </Show>
              </Password>
            </div>
          </Match>
          <Match
            when={
              objStore.state === State.Folder &&
              objStore.reader &&
              (searchParams["view"] !== "files" ||
                objStore.reader?.mode === "client")
            }
          >
            <JMComicView />
          </Match>
          <Match
            when={[State.Folder, State.FetchingMore].includes(objStore.state)}
          >
            <Folder />
          </Match>
          <Match when={objStore.state === State.File}>
            <div style={{ padding: "12px 16px 16px" }}>
              <File />
            </div>
          </Match>
          <Match when={objStore.state === State.Initial}>
            <FullLoading />
          </Match>
        </Switch>
      </Suspense>
    </div>
  )
}
