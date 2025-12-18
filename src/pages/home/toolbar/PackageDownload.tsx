import "~/utils/zip-stream.js"
import streamSaver from "streamsaver"
import { getLinkByDirAndObj, useRouter, useT } from "~/hooks"
import { fsList, pathBase, pathJoin } from "~/utils"
import { local, password, selectedObjs as _selectedObjs } from "~/store"
import { createSignal, For, Show } from "solid-js"
import {
  Button,
  Heading,
  ModalBody,
  ModalFooter,
  Text,
  VStack,
} from "@hope-ui/solid"
import { Obj } from "~/types"

streamSaver.mitm = "/streamer/mitm.html"
const trimSlash = (str: string) => {
  return str.replace(/^\/+|\/+$/g, "")
}

let totalSize = 0
interface File {
  path: string
  url: string
}

type RetryOptions = {
  retries: number
  sleepMs: number
  exponential: boolean
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const formatError = (err: unknown) => {
  if (err instanceof Error) return err.message
  return String(err)
}

const clampNonNegativeInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, parsed)
}

const calcBackoffMs = (attempt: number, baseMs: number, exp: boolean) => {
  if (baseMs <= 0) return 0
  if (!exp) return baseMs
  return baseMs * 2 ** Math.max(0, attempt - 1)
}

const fetchWithRetry = async (
  url: string,
  opts: RetryOptions,
  nameForError?: string,
) => {
  let lastErr: unknown
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      const resp = await fetch(url)
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
      }
      if (!resp.body) {
        throw new Error("Empty response body")
      }
      return resp
    } catch (err) {
      lastErr = err
      if (attempt >= opts.retries) break
      const backoff = calcBackoffMs(
        attempt + 1,
        Math.max(0, opts.sleepMs),
        opts.exponential,
      )
      if (backoff > 0) {
        await sleep(backoff)
      }
    }
  }
  const prefix = nameForError ? `${nameForError}: ` : ""
  throw new Error(`${prefix}${formatError(lastErr)}`)
}

const PackageDownload = (props: { onClose: () => void }) => {
  const t = useT()
  const [cur, setCur] = createSignal(t("home.package_download.initializing"))
  // 0: init
  // 1: error
  // 2: fetching structure
  // 3: fetching files
  // 4: success
  const [status, setStatus] = createSignal(0)
  const { pathname, isShare } = useRouter()
  const selectedObjs = _selectedObjs()
  // if (!selectedObjs.length) {
  //   notify.warning(t("home.toolbar.no_selected"));
  // }
  const fetchFolderStructure = async (
    pre: string,
    obj: Obj,
  ): Promise<File[] | string> => {
    if (!obj.is_dir) {
      totalSize += obj.size
      return [
        {
          path: pathJoin(pre, obj.name),
          url: getLinkByDirAndObj(
            pathJoin(pathname(), pre),
            obj,
            "direct",
            isShare(),
            true,
          ),
        },
      ]
    } else {
      const resp = await fsList(pathJoin(pathname(), pre, obj.name), password())
      if (resp.code !== 200) {
        return resp.message
      }
      const res: File[] = []
      for (const _obj of resp.data.content ?? []) {
        const _res = await fetchFolderStructure(pathJoin(pre, obj.name), _obj)
        if (typeof _res === "string") {
          return _res
        } else {
          res.push(..._res)
        }
      }
      return res
    }
  }
  const [fetchings, setFetchings] = createSignal<string[]>([])
  const run = async () => {
    let saveName = pathBase(pathname())
    if (selectedObjs.length === 1) {
      saveName = selectedObjs[0].name
    }
    if (!saveName) {
      saveName = t("manage.sidemenu.home")
    }
    const retryOpts: RetryOptions = {
      retries: clampNonNegativeInt(local["package_download_retry_times"], 3),
      sleepMs: clampNonNegativeInt(local["package_download_retry_sleep_ms"], 0),
      exponential: local["package_download_retry_exp"] === "true",
    }
    let fileStream = streamSaver.createWriteStream(`${saveName}.zip`, {
      size: totalSize,
    })
    setCur(t("home.package_download.fetching_struct"))
    setStatus(2)
    const downFiles: File[] = []
    for (const obj of selectedObjs) {
      const res = await fetchFolderStructure("", obj)
      if (typeof res === "string") {
        setCur(`${t("home.package_download.fetching_struct_failed")}: ${res}`)
        setStatus(1)
        return res
      } else {
        downFiles.push(...res)
      }
    }
    setCur(t("home.package_download.downloading"))
    setStatus(3)
    let fileArr = downFiles.values()
    let readableZipStream = new (window as any).ZIP({
      pull(ctrl: any) {
        const it = fileArr.next()
        if (it.done) {
          ctrl.close()
        } else {
          let name = trimSlash(it.value.path)
          if (selectedObjs.length === 1) {
            name = name.replace(`${saveName}/`, "")
          }
          const url = it.value.url
          // console.log(name, url);
          setFetchings((prev) => [...prev, name])
          return fetchWithRetry(url, retryOpts, name).then((res) => {
            ctrl.enqueue({
              name,
              stream: res.body,
            })
          })
        }
      },
    })
    if (window.WritableStream && readableZipStream.pipeTo) {
      return readableZipStream
        .pipeTo(fileStream)
        .then(() => {
          setCur(`${t("home.package_download.success")}`)
          setStatus(4)
        })
        .catch((err: any) => {
          setCur(`${t("home.package_download.failed")}: ${err}`)
          setStatus(1)
        })
    }
  }
  run()

  return (
    <>
      <ModalBody>
        <VStack w="$full" alignItems="start" spacing="$2">
          <Heading>
            {t(`home.package_download.current_status`)}: {cur()}
          </Heading>
          <For each={fetchings()}>
            {(name) => (
              <Text
                css={{
                  wordBreak: "break-all",
                }}
              >
                Fetching: {name}
              </Text>
            )}
          </For>
        </VStack>
      </ModalBody>
      <Show when={[1, 4].includes(status())}>
        <ModalFooter>
          <Button colorScheme="info" onClick={props.onClose}>
            {t("global.close")}
          </Button>
        </ModalFooter>
      </Show>
    </>
  )
}

export default PackageDownload
