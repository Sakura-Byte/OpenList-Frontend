import { Box, Checkbox, HStack, Text, VStack } from "@hope-ui/solid"
import { TbChevronDown, TbChevronRight } from "solid-icons/tb"
import { For, Show, createMemo, createSignal } from "solid-js"
import { FileIcon, FolderGlyph, fileKind } from "~/components/icons-tb"
import { useT } from "~/hooks"
import { TorrentFile } from "~/types"

// 树节点类型
interface TreeNode {
  name: string
  path: string
  isDir: boolean
  size: number
  children: TreeNode[]
  fileIndex?: number // 对应 files 数组中的索引（仅叶子节点）
  allIndices?: number[] // 目录下所有文件索引（仅目录节点，构建时缓存）
}

// 将扁平文件列表构建为树形结构
function buildFileTree(files: TorrentFile[]): TreeNode[] {
  const root: TreeNode = {
    name: "",
    path: "",
    isDir: true,
    size: 0,
    children: [],
  }

  files.forEach((file, index) => {
    const parts = file.path.split("/")
    let current = root

    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        current.children.push({
          name: part,
          path: file.path,
          isDir: false,
          size: file.size,
          children: [],
          fileIndex: index,
        })
      } else {
        let dirNode = current.children.find((c) => c.isDir && c.name === part)
        if (!dirNode) {
          dirNode = {
            name: part,
            path: parts.slice(0, i + 1).join("/"),
            isDir: true,
            size: 0,
            children: [],
          }
          current.children.push(dirNode)
        }
        current = dirNode
      }
    })
  })

  function calcDirMetadata(node: TreeNode): number {
    if (!node.isDir) return node.size
    node.size = node.children.reduce(
      (sum, child) => sum + calcDirMetadata(child),
      0,
    )
    node.allIndices = getAllFileIndices(node)
    return node.size
  }
  root.children.forEach(calcDirMetadata)

  if (root.children.length === 1 && root.children[0].isDir) {
    return root.children
  }
  return root.children
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function getAllFileIndices(node: TreeNode): number[] {
  if (!node.isDir) {
    return node.fileIndex !== undefined ? [node.fileIndex] : []
  }
  return node.children.flatMap(getAllFileIndices)
}

export interface TorrentFileListProps {
  files: TorrentFile[]
  selectedFiles: number[]
  onSelectionChange: (selected: number[]) => void
}

export const TorrentFileList = (props: TorrentFileListProps) => {
  const t = useT()

  const tree = createMemo(() => buildFileTree(props.files))
  const selectedSet = createMemo(() => new Set(props.selectedFiles))

  const allSelected = createMemo(
    () => props.selectedFiles.length === props.files.length,
  )
  const noneSelected = createMemo(() => props.selectedFiles.length === 0)

  const toggleAll = () => {
    if (allSelected()) {
      props.onSelectionChange([])
    } else {
      props.onSelectionChange(props.files.map((_, i) => i))
    }
  }

  const toggleFile = (index: number) => {
    const set = selectedSet()
    if (set.has(index)) {
      props.onSelectionChange(props.selectedFiles.filter((i) => i !== index))
    } else {
      props.onSelectionChange([...props.selectedFiles, index])
    }
  }

  const toggleDir = (node: TreeNode) => {
    const indices = node.allIndices ?? getAllFileIndices(node)
    const set = selectedSet()
    const allChecked = indices.every((i) => set.has(i))
    if (allChecked) {
      const removeSet = new Set(indices)
      props.onSelectionChange(
        props.selectedFiles.filter((i) => !removeSet.has(i)),
      )
    } else {
      const newSelection = [...new Set([...props.selectedFiles, ...indices])]
      props.onSelectionChange(newSelection)
    }
  }

  return (
    <VStack spacing="$1" alignItems="stretch">
      <HStack justifyContent="space-between" alignItems="center" p="$1">
        <Checkbox
          checked={allSelected()}
          indeterminate={!allSelected() && !noneSelected()}
          onChange={toggleAll}
        >
          <Text fontSize="$sm">
            {t("home.toolbar.offline_download_enhanced.select_all")} (
            {props.selectedFiles.length}/{props.files.length})
          </Text>
        </Checkbox>
        <Text fontSize="$xs" color="$neutral10">
          {formatFileSize(
            props.selectedFiles.reduce(
              (sum, i) => sum + (props.files[i]?.size || 0),
              0,
            ),
          )}
        </Text>
      </HStack>

      <Box
        maxH="300px"
        overflowY="auto"
        border="1px solid $neutral6"
        borderRadius="$sm"
        p="$1"
      >
        <For each={tree()}>
          {(node) => (
            <TreeNodeItem
              node={node}
              selectedSet={selectedSet()}
              onToggleFile={toggleFile}
              onToggleDir={toggleDir}
              depth={0}
            />
          )}
        </For>
      </Box>
    </VStack>
  )
}

function TreeNodeItem(props: {
  node: TreeNode
  selectedSet: Set<number>
  onToggleFile: (index: number) => void
  onToggleDir: (node: TreeNode) => void
  depth: number
}) {
  const [expanded, setExpanded] = createSignal(true)

  const isChecked = createMemo(() => {
    if (!props.node.isDir) {
      return props.selectedSet.has(props.node.fileIndex!)
    }
    const indices = props.node.allIndices ?? getAllFileIndices(props.node)
    return indices.length > 0 && indices.every((i) => props.selectedSet.has(i))
  })

  const isIndeterminate = createMemo(() => {
    if (!props.node.isDir) return false
    const indices = props.node.allIndices ?? getAllFileIndices(props.node)
    const checkedCount = indices.filter((i) => props.selectedSet.has(i)).length
    return checkedCount > 0 && checkedCount < indices.length
  })

  return (
    <Box pl={`${props.depth * 16}px`}>
      <HStack
        spacing="$1"
        py="$0_5"
        alignItems="center"
        _hover={{ bg: "$neutral3" }}
        borderRadius="$xs"
        px="$1"
      >
        <Show when={props.node.isDir}>
          <Box
            cursor="pointer"
            onClick={() => setExpanded(!expanded())}
            w="16px"
            display="inline-grid"
            style={{ "place-items": "center" }}
            color="$neutral10"
            flexShrink={0}
          >
            <Show
              when={expanded()}
              fallback={<TbChevronRight size={13} class="ol-ico" />}
            >
              <TbChevronDown size={13} class="ol-ico" />
            </Show>
          </Box>
        </Show>
        <Show when={!props.node.isDir}>
          <Box w="16px" flexShrink={0} />
        </Show>

        <Checkbox
          size="sm"
          checked={isChecked()}
          indeterminate={isIndeterminate()}
          onChange={() => {
            if (props.node.isDir) {
              props.onToggleDir(props.node)
            } else {
              props.onToggleFile(props.node.fileIndex!)
            }
          }}
        />

        <span style={{ display: "inline-flex", "flex-shrink": 0 }}>
          <Show
            when={props.node.isDir}
            fallback={
              <FileIcon kind={fileKind(props.node.name, false)} size={16} />
            }
          >
            <FolderGlyph size={16} />
          </Show>
        </span>

        <Text
          fontSize="$sm"
          flex={1}
          css={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={props.node.name}
        >
          {props.node.name}
        </Text>

        <Text fontSize="$xs" color="$neutral10" flexShrink={0}>
          {formatFileSize(props.node.size)}
        </Text>
      </HStack>

      <Show when={props.node.isDir && expanded()}>
        <For each={props.node.children}>
          {(child) => (
            <TreeNodeItem
              node={child}
              selectedSet={props.selectedSet}
              onToggleFile={props.onToggleFile}
              onToggleDir={props.onToggleDir}
              depth={props.depth + 1}
            />
          )}
        </For>
      </Show>
    </Box>
  )
}
