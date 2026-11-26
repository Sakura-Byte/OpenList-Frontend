import { JSXElement, Show, createEffect, createSignal, on } from "solid-js"
import { OlDialog } from "~/components/ui"
import { useT } from "~/hooks"
import { notify, validateFilename } from "~/utils"

export type ModalTwoInputProps = {
  opened: boolean
  onClose: () => void
  title: string
  onSubmit?: (text1: string, text2: string) => void
  type?: string
  defaultValue1?: string
  defaultValue2?: string
  loading?: boolean
  tips?: string
  topSlot?: JSXElement
  validateFilename?: boolean
}

export const ModalTwoInput = (props: ModalTwoInputProps) => {
  const [value1, setValue1] = createSignal(props.defaultValue1 ?? "")
  const [value2, setValue2] = createSignal(props.defaultValue2 ?? "")
  const [validationError1, setValidationError1] = createSignal<string>("")
  const [validationError2, setValidationError2] = createSignal<string>("")
  const t = useT()
  let firstInputRef: HTMLInputElement | HTMLTextAreaElement | undefined

  createEffect(
    on(
      () => props.opened,
      (opened) => {
        if (opened) {
          setValue1(props.defaultValue1 ?? "")
          setValue2(props.defaultValue2 ?? "")
          setValidationError1("")
          setValidationError2("")
        }
      },
    ),
  )

  const handleInput1 = (newValue: string) => {
    setValue1(newValue)
    if (props.validateFilename) {
      const validation = validateFilename(newValue)
      setValidationError1(validation.valid ? "" : validation.error || "")
    } else {
      setValidationError1("")
    }
  }

  const handleInput2 = (newValue: string) => {
    setValue2(newValue)
    if (props.validateFilename) {
      const validation = validateFilename(newValue)
      setValidationError2(validation.valid ? "" : validation.error || "")
    } else {
      setValidationError2("")
    }
  }

  const submit = () => {
    if (props.validateFilename) {
      const validation1 = validateFilename(value1())
      const validation2 = validateFilename(value2())

      if (!validation1.valid) {
        notify.warning(t(`global.${validation1.error}`))
        return
      }
      if (!validation2.valid) {
        notify.warning(t(`global.${validation2.error}`))
        return
      }
    } else if (!value1() || !value2()) {
      notify.warning(t("global.empty_input"))
      return
    }
    props.onSubmit?.(value1(), value2())
  }

  return (
    <OlDialog
      open={props.opened}
      onClose={props.onClose}
      title={t(props.title)}
      onOpenAutoFocus={(e) => {
        e.preventDefault()
        firstInputRef?.focus()
      }}
      footer={
        <>
          <button type="button" class="ol-btn" onClick={props.onClose}>
            {t("global.cancel")}
          </button>
          <button
            type="button"
            class="ol-btn ol-btn--primary"
            disabled={props.loading || !value1() || !value2()}
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
          <div
            style={{ display: "flex", "flex-direction": "column", gap: "8px" }}
          >
            <input
              id="modal-input1"
              ref={(el) => (firstInputRef = el)}
              class="ol-ui-input"
              type={props.type || "text"}
              value={value1()}
              data-invalid={Boolean(validationError1())}
              onInput={(e) => handleInput1(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <Show when={validationError1()}>
              <p class="ol-ui-helper" data-error="true">
                {t(`global.${validationError1()}`)}
              </p>
            </Show>
            <input
              id="modal-input2"
              class="ol-ui-input"
              type={props.type || "text"}
              value={value2()}
              data-invalid={Boolean(validationError2())}
              onInput={(e) => handleInput2(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <Show when={validationError2()}>
              <p class="ol-ui-helper" data-error="true">
                {t(`global.${validationError2()}`)}
              </p>
            </Show>
          </div>
        }
      >
        <div
          style={{ display: "flex", "flex-direction": "column", gap: "8px" }}
        >
          <textarea
            id="modal-input1"
            ref={(el) => (firstInputRef = el)}
            class="ol-ui-textarea"
            value={value1()}
            data-invalid={Boolean(validationError1())}
            onInput={(e) => handleInput1(e.currentTarget.value)}
          />
          <Show when={validationError1()}>
            <p class="ol-ui-helper" data-error="true">
              {t(`global.${validationError1()}`)}
            </p>
          </Show>
          <textarea
            id="modal-input2"
            class="ol-ui-textarea"
            value={value2()}
            data-invalid={Boolean(validationError2())}
            onInput={(e) => handleInput2(e.currentTarget.value)}
          />
          <Show when={validationError2()}>
            <p class="ol-ui-helper" data-error="true">
              {t(`global.${validationError2()}`)}
            </p>
          </Show>
        </div>
      </Show>
      <Show when={props.tips}>
        <p class="ol-ui-helper">{props.tips}</p>
      </Show>
    </OlDialog>
  )
}
