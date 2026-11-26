import { lazy } from "solid-js"
import { Portal } from "solid-js/web"
import { BackTop } from "./BackTop"
import { BatchRename } from "./BatchRename"
import { Copy, Move } from "./CopyMove"
import { Decompress } from "./Decompress"
import { Delete } from "./Delete"
import { PackageDownloadModal } from "./Download"
import { LocalSettings } from "./LocalSettings"
import { Mkdir } from "./Mkdir"
import { ModalWrapper } from "./ModalWrapper"
import { NewFile } from "./NewFile"
import { OfflineDownloadEnhanced } from "./OfflineDownloadEnhanced"
import { RecursiveMove } from "./RecursiveMove"
import { RemoveEmptyDirectory } from "./RemoveEmptyDirectory"
import { Rename } from "./Rename"
import { Right } from "./Right"
import { Share } from "./Share"

const Upload = lazy(() => import("../uploads/Upload"))

export const Modal = () => {
  return (
    <>
      <Copy />
      <Move />
      <Rename />
      <Delete />
      <Decompress />
      <NewFile />
      <Mkdir />
      <Share />
      <RecursiveMove />
      <RemoveEmptyDirectory />
      <BatchRename />
      <OfflineDownloadEnhanced />
      <PackageDownloadModal />
      <ModalWrapper name="upload" title="home.toolbar.upload">
        <Upload />
      </ModalWrapper>
      <LocalSettings />
    </>
  )
}

export const Toolbar = () => {
  return (
    <Portal>
      <div class="ol-modern-scope ol-fab-group">
        <BackTop />
        <Right />
      </div>
      <Modal />
    </Portal>
  )
}
