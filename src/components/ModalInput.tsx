import {
  JSXElement,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
} from "solid-js"
import { OlDialog } from "~/components/ui"
import { useT } from "~/hooks"
import { notify, validateFilename } from "~/utils"

export type ModalInputProps = {
  opened: boolean
  onClose: () => void
  title: string
  isRenamingFile?: boolean
  onSubmit?: (text: string) => void
  type?: string
  defaultValue?: string
  loading?: boolean
  tips?: string
  topSlot?: JSXElement
  bottomSlot?: JSXElement
  footerSlot?: JSXElement
  onDrop?: (e: DragEvent, setValue: (value: string) => void) => void
  validateFilename?: boolean
}

export const ModalInput = (props: ModalInputProps) => {
  const [value, setValue] = createSignal(props.defaultValue ?? "")
  const [validationError, setValidationError] = createSignal<string>("")
  const t = useT()

  let inputRef: HTMLInputElement | HTMLTextAreaElement | undefined

  const handleFocus = () => {
    const dotIndex = value().lastIndexOf(".")
    window.setTimeout(() => {
      if (!inputRef) return
      if (dotIndex > 0 && props.isRenamingFile) {
        inputRef.setSelectionRange(0, dotIndex)
      } else {
        inputRef.select()
      }
    }, 10)
  }

  createEffect(
    on(
      () => props.opened,
      (opened) => {
        if (opened) {
          setValue(props.defaultValue ?? "")
          setValidationError("")
          window.setTimeout(() => {
            if (inputRef) {
              inputRef.focus()
              handleFocus()
            }
          }, 15)
        } else {
          setValue("")
          setValidationError("")
        }
      },
    ),
  )

  onCleanup(() => {
    if (inputRef) {
      inputRef.setSelectionRange(0, 0)
    }
  })

  const submit = () => {
    if (props.validateFilename) {
      const validation = validateFilename(value())
      if (!validation.valid) {
        notify.warning(t(`global.${validation.error}`))
        return
      }
    } else if (!value() || value().trim().length === 0) {
      notify.warning(t("global.empty_input"))
      return
    }
    props.onSubmit?.(value())
  }

  const handleInput = (newValue: string) => {
    setValue(newValue)
    if (props.validateFilename) {
      const validation = validateFilename(newValue)
      setValidationError(validation.valid ? "" : validation.error || "")
    } else {
      setValidationError("")
    }
  }

  return (
    <OlDialog
      open={props.opened}
      onClose={props.onClose}
      title={t(props.title)}
      onDrop={(e: DragEvent) => props.onDrop?.(e, setValue)}
      onOpenAutoFocus={(e) => {
        e.preventDefault()
        inputRef?.focus()
        handleFocus()
      }}
      footer={
        <>
          <Show when={props.footerSlot}>
            <div style={{ "margin-right": "auto" }}>{props.footerSlot}</div>
          </Show>
          <button type="button" class="ol-btn" onClick={props.onClose}>
            {t("global.cancel")}
          </button>
          <button
            type="button"
            class="ol-btn ol-btn--primary"
            disabled={props.loading}
            onClick={submit}
          >
            <Show when={props.loading}>
              <span class="ol-ui-spinner" aria-hidden="true" />
            </Show>
            {t("global.ok")}
          </button>
        </>
      }
    >
      <Show when={props.topSlot}>{props.topSlot}</Show>
      <Show
        when={props.type === "text"}
        fallback={
          <input
            id="modal-input"
            class="ol-ui-input"
            type={props.type || "text"}
            value={value()}
            ref={(el) => (inputRef = el)}
            data-invalid={Boolean(validationError())}
            onInput={(e) => handleInput(e.currentTarget.value)}
            onFocus={handleFocus}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                submit()
              }
            }}
          />
        }
      >
        <textarea
          id="modal-input"
          class="ol-ui-textarea"
          value={value()}
          ref={(el) => (inputRef = el)}
          data-invalid={Boolean(validationError())}
          onInput={(e) => handleInput(e.currentTarget.value)}
          onFocus={handleFocus}
        />
      </Show>
      <Show when={validationError()}>
        <p class="ol-ui-helper" data-error="true">
          {t(`global.${validationError()}`)}
        </p>
      </Show>
      <Show when={props.tips}>
        <p class="ol-ui-helper">{props.tips}</p>
      </Show>
      <Show when={props.bottomSlot}>{props.bottomSlot}</Show>
    </OlDialog>
  )
}
