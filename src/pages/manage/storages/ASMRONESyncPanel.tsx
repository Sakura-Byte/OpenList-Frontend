import { Box, Button, HStack, Input, Text, VStack } from "@hope-ui/solid"
import { createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { currentLang } from "~/app/i18n"
import { useT } from "~/hooks"
import { EmptyResp, Resp } from "~/types"
import { getFileSize, handleResp, r } from "~/utils"
import zh from "./asmrone_zh.json"

interface SyncStatus {
  phase: string
  paused: boolean
  works: number
  cached: number
  pending: number
  failed: number
  current_task: string
  pages: number
  total_pages: number
  last_sync: number
  last_full_sync: number
  next_sync: number
  next_full_sync: number
  cache_bytes: number
  last_error: string
}

export const useASMRONETranslation = () => {
  const t = useT()
  return (key: string) =>
    String(currentLang()).toLowerCase().startsWith("zh") && key in zh
      ? zh[key as keyof typeof zh]
      : t(`storages.asmrone.${key}`)
}

export function ASMRONESyncPanel(props: {
  storageId: number
  disabled: boolean
}) {
  const t = useASMRONETranslation()
  const [status, setStatus] = createSignal<SyncStatus>()
  const [error, setError] = createSignal("")
  const [busy, setBusy] = createSignal(false)
  const [workId, setWorkId] = createSignal("")
  let disposed = false
  let polling = false
  const refresh = async () => {
    if (disposed || polling || props.disabled || document.hidden) return
    polling = true
    try {
      const response: Resp<SyncStatus> = await r.get(
        `/admin/storage/asmrone/status?id=${props.storageId}`,
      )
      if (disposed) return
      if (response.code === 200) {
        setStatus(response.data)
        setError("")
      } else setError(response.message)
    } catch {
      if (!disposed) setError(t("request_failed"))
    } finally {
      polling = false
    }
  }
  const action = async (name: string) => {
    if (busy()) return
    setBusy(true)
    try {
      const response: EmptyResp = await r.post(
        "/admin/storage/asmrone/action",
        {
          id: props.storageId,
          action: name,
          work_id: name === "refresh" ? workId().trim() : undefined,
        },
      )
      if (!disposed) handleResp(response, () => void refresh())
    } catch {
      if (!disposed) setError(t("request_failed"))
    } finally {
      if (!disposed) setBusy(false)
    }
  }
  onMount(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), 3000)
    const visible = () => void refresh()
    document.addEventListener("visibilitychange", visible)
    onCleanup(() => {
      disposed = true
      clearInterval(timer)
      document.removeEventListener("visibilitychange", visible)
    })
  })
  const date = (timestamp: number) =>
    timestamp ? new Date(timestamp * 1000).toLocaleString() : t("never")
  return (
    <VStack
      alignItems="start"
      spacing="$3"
      p="$4"
      w="$full"
      border="1px solid $neutral7"
      rounded="$lg"
    >
      <Text fontSize="$lg" fontWeight="$semibold">
        {t("title")}
      </Text>
      <Text color="$neutral11">{t("policy")}</Text>
      <Show when={props.disabled}>
        <Text>{t("disabled")}</Text>
      </Show>
      <Show when={error()}>
        <Text color="$danger10" role="alert">
          {error()}
        </Text>
      </Show>
      <Show when={status()}>
        {(s) => (
          <>
            <Text aria-live="polite">
              {s().paused ? t("paused") : t(s().phase as keyof typeof zh)} ·{" "}
              {s().current_task}
            </Text>
            <HStack flexWrap="wrap" gap="$4">
              <Text>
                {t("works")}: {s().works.toLocaleString()}
              </Text>
              <Text>
                {t("cached")}: {s().cached.toLocaleString()}
              </Text>
              <Text>
                {t("pending")}: {s().pending.toLocaleString()}
              </Text>
              <Text>
                {t("failed")}: {s().failed.toLocaleString()}
              </Text>
              <Text>
                {t("cache_size")}: {getFileSize(s().cache_bytes)}
              </Text>
            </HStack>
            <Show when={s().total_pages > 0}>
              <Text>
                {t("pages")}: {s().pages} / {s().total_pages}
              </Text>
            </Show>
            <Box>
              <Text>
                {t("last_sync")}: {date(s().last_sync)}
              </Text>
              <Text>
                {t("next_sync")}: {date(s().next_sync)}
              </Text>
              <Text>
                {t("last_full")}: {date(s().last_full_sync)}
              </Text>
              <Text>
                {t("next_full")}: {date(s().next_full_sync)}
              </Text>
            </Box>
            <Show when={s().last_error}>
              <Text color="$danger10" css={{ "overflow-wrap": "anywhere" }}>
                {s().last_error}
              </Text>
            </Show>
          </>
        )}
      </Show>
      <HStack flexWrap="wrap" gap="$2">
        <Button
          disabled={busy() || props.disabled || !status()}
          onClick={() => action(status()?.paused ? "resume" : "pause")}
        >
          {status()?.paused ? t("resume") : t("pause")}
        </Button>
        <For each={["incremental", "full", "retry"] as const}>
          {(name) => (
            <Button
              disabled={busy() || props.disabled}
              onClick={() => action(name)}
            >
              {t(`${name}_action`)}
            </Button>
          )}
        </For>
      </HStack>
      <HStack w="$full" flexWrap="wrap" gap="$2">
        <Input
          aria-label={t("work_id")}
          placeholder={t("work_id")}
          value={workId()}
          onInput={(event) => setWorkId(event.currentTarget.value)}
          maxW="$sm"
        />
        <Button
          disabled={busy() || props.disabled || !workId().trim()}
          onClick={() => action("refresh")}
        >
          {t("refresh_work")}
        </Button>
      </HStack>
    </VStack>
  )
}
