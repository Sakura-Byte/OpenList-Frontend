import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Switch as HopeSwitch,
  Textarea,
} from "@hope-ui/solid"
import {
  TbAlertTriangle,
  TbArrowLeft,
  TbDeviceFloppy,
  TbInfoCircle,
  TbSpeakerphone,
} from "solid-icons/tb"
import { Show } from "solid-js"
import { createStore } from "solid-js/store"
import { FolderChooseInput, MaybeLoading, SelectWrapper } from "~/components"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { loadPublicNotices } from "~/store"
import {
  Notice,
  NoticeDismissStrategy,
  NoticeDisplayType,
  NoticeSeverity,
  PEmptyResp,
  PResp,
} from "~/types"
import { handleResp, notify, r } from "~/utils"

function isoToDatetimeLocal(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function datetimeLocalToIso(val: string): string | null {
  if (!val || !val.trim()) return null
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

const AddOrEditNotice = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.notices")
  const { params, to } = useRouter()
  const { id } = params

  const [notice, setNotice] = createStore<Notice>({
    id: 0,
    title: "",
    summary: "",
    content: "",
    version_hash: "",
    severity: "info",
    display_type: "auto",
    dismiss_strategy: "until_updated",
    path_prefix: "/",
    start_at: null,
    end_at: null,
    sort: 0,
    enabled: true,
  })

  const [loading, loadItem] = useFetch((): PResp<Notice> =>
    r.get(`/admin/notice/get?id=${id}`),
  )

  if (id) {
    loadItem().then((resp) => {
      handleResp<Notice>(resp, (data) => setNotice(data))
    })
  }

  const [saving, saveItem] = useFetch((): PEmptyResp =>
    r.post(`/admin/notice/${id ? "update" : "create"}`, {
      ...notice,
      version_hash: "",
    }),
  )

  const severities: NoticeSeverity[] = ["info", "warning", "critical"]
  const displayTypes: NoticeDisplayType[] = [
    "auto",
    "top_banner",
    "modal",
    "both",
  ]
  const dismissStrategies: NoticeDismissStrategy[] = [
    "until_updated",
    "24h",
    "session",
  ]

  return (
    <MaybeLoading loading={loading()}>
      <div class="ol-admin-page">
        <div class="ol-admin-head">
          <div class="ol-admin-head__main">
            <h1 class="ol-admin-title">{t(`global.${id ? "edit" : "add"}`)}</h1>
            <p class="ol-admin-subtitle">{t("manage.sidemenu.notices")}</p>
          </div>
          <div class="ol-admin-head__actions">
            <button
              type="button"
              class="ol-btn"
              onClick={() => to("/@manage/notices")}
            >
              <TbArrowLeft size={15} class="ol-ico" />
              <span>{t("global.back")}</span>
            </button>
          </div>
        </div>

        {/* Live Banner Preview */}
        <div
          class="ol-notice"
          data-severity={notice.severity}
          role="status"
          style={{
            "border-radius": "var(--ol-radius-lg)",
            border: "1px solid var(--ol-border)",
          }}
        >
          <span class="ol-notice__icon">
            {notice.severity === "critical" ? (
              <TbSpeakerphone size={16} class="ol-ico" />
            ) : notice.severity === "warning" ? (
              <TbAlertTriangle size={16} class="ol-ico" />
            ) : (
              <TbInfoCircle size={16} class="ol-ico" />
            )}
          </span>
          <span class="ol-notice__text">
            <Show when={notice.title}>
              <b>{notice.title}</b>
            </Show>
            {notice.summary ||
              (!notice.title ? t("home.notice.site_announcement") : "")}
          </span>
          <Show when={notice.content?.trim()}>
            <span
              class="ol-link-btn"
              style={{
                "font-size": "13px",
                "flex-shrink": 0,
                "pointer-events": "none",
              }}
            >
              {t("home.notice.details")}
            </span>
          </Show>
        </div>

        {/* 2-Column Editor Layout */}
        <div
          style={{
            display: "grid",
            "grid-template-columns":
              "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: "16px",
            "align-items": "start",
          }}
        >
          <section class="ol-admin-card">
            <div class="ol-admin-form-stack">
              <FormControl w="$full" required>
                <FormLabel for="notice-title">{t("notices.title")}</FormLabel>
                <Input
                  id="notice-title"
                  value={notice.title}
                  onInput={(e) => setNotice("title", e.currentTarget.value)}
                />
              </FormControl>

              <FormControl w="$full">
                <FormLabel for="notice-summary">
                  {t("notices.summary")}
                </FormLabel>
                <Input
                  id="notice-summary"
                  value={notice.summary}
                  onInput={(e) => setNotice("summary", e.currentTarget.value)}
                />
                <FormHelperText>{t("notices.summary_help")}</FormHelperText>
              </FormControl>

              <FormControl w="$full">
                <FormLabel for="notice-content">
                  {t("notices.content")}
                </FormLabel>
                <Textarea
                  id="notice-content"
                  rows={10}
                  value={notice.content}
                  onInput={(e) => setNotice("content", e.currentTarget.value)}
                />
                <FormHelperText>{t("notices.content_help")}</FormHelperText>
              </FormControl>
            </div>
          </section>

          <section class="ol-admin-card">
            <div class="ol-admin-form-stack">
              <FormControl w="$full">
                <FormLabel>{t("notices.severity")}</FormLabel>
                <SelectWrapper
                  value={notice.severity}
                  onChange={(v) => setNotice("severity", v as NoticeSeverity)}
                  options={severities.map((v) => ({
                    value: v,
                    label: t(`notices.severities.${v}`),
                  }))}
                />
              </FormControl>

              <FormControl w="$full">
                <FormLabel>{t("notices.display_type")}</FormLabel>
                <SelectWrapper
                  value={notice.display_type}
                  onChange={(v) =>
                    setNotice("display_type", v as NoticeDisplayType)
                  }
                  options={displayTypes.map((v) => ({
                    value: v,
                    label: t(`notices.display_types.${v}`),
                  }))}
                />
              </FormControl>

              <FormControl w="$full">
                <FormLabel>{t("notices.dismiss_strategy")}</FormLabel>
                <SelectWrapper
                  value={notice.dismiss_strategy}
                  onChange={(v) =>
                    setNotice("dismiss_strategy", v as NoticeDismissStrategy)
                  }
                  options={dismissStrategies.map((v) => ({
                    value: v,
                    label: t(`notices.dismiss_strategies.${v}`),
                  }))}
                />
              </FormControl>

              <FormControl w="$full">
                <FormLabel>{t("notices.path_prefix")}</FormLabel>
                <FolderChooseInput
                  value={notice.path_prefix}
                  onChange={(p) => setNotice("path_prefix", p || "/")}
                />
              </FormControl>

              <FormControl w="$full">
                <FormLabel for="notice-sort">{t("notices.sort")}</FormLabel>
                <Input
                  id="notice-sort"
                  type="number"
                  class="ol-tabular"
                  value={notice.sort}
                  onInput={(e) =>
                    setNotice("sort", Number(e.currentTarget.value) || 0)
                  }
                />
              </FormControl>

              <div class="ol-admin-form-grid">
                <FormControl w="$full">
                  <FormLabel for="notice-start">
                    {t("notices.start_at")}
                  </FormLabel>
                  <Input
                    id="notice-start"
                    type="datetime-local"
                    value={isoToDatetimeLocal(notice.start_at)}
                    onInput={(e) =>
                      setNotice(
                        "start_at",
                        datetimeLocalToIso(e.currentTarget.value),
                      )
                    }
                  />
                </FormControl>

                <FormControl w="$full">
                  <FormLabel for="notice-end">{t("notices.end_at")}</FormLabel>
                  <Input
                    id="notice-end"
                    type="datetime-local"
                    value={isoToDatetimeLocal(notice.end_at)}
                    onInput={(e) =>
                      setNotice(
                        "end_at",
                        datetimeLocalToIso(e.currentTarget.value),
                      )
                    }
                  />
                </FormControl>
              </div>

              <FormControl
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                pt="$1"
              >
                <FormLabel for="notice-enabled" mb="0">
                  {t("notices.enabled")}
                </FormLabel>
                <HopeSwitch
                  id="notice-enabled"
                  checked={notice.enabled}
                  onChange={(e: any) =>
                    setNotice("enabled", e.currentTarget.checked)
                  }
                />
              </FormControl>
            </div>
          </section>
        </div>

        <div class="ol-sticky-actions">
          <button
            type="button"
            class="ol-btn"
            onClick={() => to("/@manage/notices")}
          >
            <span>{t("global.cancel")}</span>
          </button>
          <Button
            colorScheme="accent"
            loading={saving()}
            onClick={async () => {
              const resp = await saveItem()
              handleResp(resp, () => {
                notify.success(t("global.save_success"))
                loadPublicNotices()
                to("/@manage/notices", false, { replace: true })
              })
            }}
          >
            <TbDeviceFloppy
              size={15}
              class="ol-ico"
              style={{ "margin-right": "5px" }}
            />
            {t(`global.${id ? "save" : "add"}`)}
          </Button>
        </div>
      </div>
    </MaybeLoading>
  )
}

export default AddOrEditNotice
