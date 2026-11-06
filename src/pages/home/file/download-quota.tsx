import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Text,
  VStack,
} from "@hope-ui/solid"
import { Show } from "solid-js"
import { useT } from "~/hooks"
import { objStore } from "~/store"
import { DownloadQuota } from "~/types"
import { formatDate } from "~/utils"

const Notice = (props: { quota: DownloadQuota }) => {
  const t = useT()
  return (
    <Show
      when={props.quota.blocked}
      fallback={
        <Text size="sm" color="$neutral10" textAlign="center" w="$full">
          {t("home.preview.download_quota_remaining", {
            remaining: props.quota.remaining,
            limit: props.quota.limit,
          })}
        </Text>
      }
    >
      <Alert
        status="warning"
        variant="subtle"
        w="$full"
        flexDirection="column"
        textAlign="center"
        py="$6"
      >
        <AlertIcon boxSize="$8" mb="$3" />
        <AlertTitle mb="$2">
          {t("home.preview.download_quota_title")}
        </AlertTitle>
        <AlertDescription>
          <VStack spacing="$1">
            <Text>
              {t("home.preview.download_quota_blocked", {
                limit: props.quota.limit,
                time: formatDate(
                  new Date(props.quota.reset_at * 1000).toISOString(),
                ),
              })}
            </Text>
            <Text size="sm">{t("home.preview.download_quota_local")}</Text>
          </VStack>
        </AlertDescription>
      </Alert>
    </Show>
  )
}

export const DownloadQuotaNotice = () => (
  <Show when={objStore.download_quota} keyed>
    {(quota) => <Notice quota={quota} />}
  </Show>
)
