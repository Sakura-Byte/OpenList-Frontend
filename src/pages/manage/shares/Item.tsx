import {
  Center,
  FormControl,
  FormLabel,
  Input,
  Select,
  Switch as HopeSwitch,
  Textarea,
} from "@hope-ui/solid"
import { TbRefresh } from "solid-icons/tb"
import { Match, Show, Switch } from "solid-js"
import { MultiPathInput, SelectOptions } from "~/components"
import { useT } from "~/hooks"
import { Type } from "~/types"

export type ItemProps = {
  name: string
  required?: boolean
  readonly?: boolean
  full_name_path?: string
  options?: string
  options_prefix?: string
  valid?: boolean
  placeholder?: string
} & (
  | {
      type: Type.Bool
      onChange?: (value: boolean) => void
      value: boolean
    }
  | {
      type: Type.Number
      onChange?: (value: number) => void
      value: number
    }
  | {
      type: Type.Float
      onChange?: (value: number) => void
      value: number
    }
  | {
      type: Type.String | Type.Text
      onChange?: (value: string) => void
      value: string
      random?: () => string
    }
  | {
      type: Type.MultiPath
      onChange?: (value: string) => void
      value: string
      basePath?: string
    }
  | {
      type: Type.Select
      searchable?: boolean
      onChange?: (value: string) => void
      value: string
    }
)

const Item = (props: ItemProps) => {
  const t = useT()
  return (
    <FormControl
      w="$full"
      display="flex"
      flexDirection="column"
      required={props.required}
    >
      <FormLabel for={props.name} display="flex" alignItems="center">
        {t(props.full_name_path ?? `shares.${props.name}`)}
      </FormLabel>
      <Switch fallback={<Center>{t("settings.unknown_type")}</Center>}>
        <Match when={props.type === Type.String}>
          <div
            style={{
              display: "flex",
              "align-items": "center",
              gap: "8px",
              width: "100%",
            }}
          >
            <Input
              id={props.name}
              type="text"
              readOnly={props.readonly}
              value={props.value as string}
              invalid={!props.valid}
              placeholder={props.placeholder}
              onChange={
                props.type === Type.String
                  ? (e) => props.onChange?.(e.currentTarget.value)
                  : undefined
              }
            />
            <Show when={props.type === Type.String && props.random}>
              <button
                type="button"
                class="ol-btn"
                aria-label="random"
                title={t("global.refresh")}
                onClick={
                  props.type === Type.String
                    ? () => props.onChange?.(props.random!())
                    : undefined
                }
              >
                <TbRefresh size={15} class="ol-ico" />
              </button>
            </Show>
          </div>
        </Match>
        <Match when={props.type === Type.Number}>
          <Input
            type="number"
            id={props.name}
            readOnly={props.readonly}
            value={props.value as number}
            invalid={!props.valid}
            placeholder={props.placeholder}
            onInput={
              props.type === Type.Number
                ? (e) => props.onChange?.(parseInt(e.currentTarget.value))
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Float}>
          <Input
            type="number"
            id={props.name}
            readOnly={props.readonly}
            value={props.value as number}
            invalid={!props.valid}
            placeholder={props.placeholder}
            onInput={
              props.type === Type.Float
                ? (e) => props.onChange?.(parseFloat(e.currentTarget.value))
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.Bool}>
          <div
            style={{
              display: "flex",
              "align-items": "center",
              "min-height": "36px",
            }}
          >
            <HopeSwitch
              id={props.name}
              readOnly={props.readonly}
              checked={Boolean(props.value)}
              invalid={!props.valid}
              onChange={
                props.type === Type.Bool
                  ? (e: any) => props.onChange?.(e.currentTarget.checked)
                  : undefined
              }
            />
          </div>
        </Match>
        <Match when={props.type === Type.Text}>
          <Textarea
            id={props.name}
            rows={3}
            readOnly={props.readonly}
            value={props.value as string}
            invalid={!props.valid}
            placeholder={props.placeholder}
            onChange={
              props.type === Type.Text
                ? (e) => props.onChange?.(e.currentTarget.value)
                : undefined
            }
          />
        </Match>
        <Match when={props.type === Type.MultiPath}>
          <MultiPathInput
            id={props.name}
            value={props.value as string}
            valid={props.valid}
            readOnly={props.readonly}
            basePath={
              props.type === Type.MultiPath ? props.basePath : undefined
            }
            onChange={(value) => {
              if (props.type === Type.MultiPath) {
                props.onChange?.(value)
              }
            }}
          />
        </Match>
        <Match when={props.type === Type.Select}>
          <Select
            id={props.name}
            readOnly={props.readonly}
            value={props.value}
            invalid={!props.valid}
            onChange={
              props.type === Type.Select
                ? (e) => props.onChange?.(e)
                : undefined
            }
          >
            <SelectOptions
              readonly={props.readonly}
              searchable={props.type === Type.Select && props.searchable}
              options={props.options!.split(",").map((key) => ({
                key,
                label: t(
                  (props.options_prefix ?? `shares.${props.name}s`) + `.${key}`,
                ),
              }))}
            />
          </Select>
        </Match>
      </Switch>
    </FormControl>
  )
}

export { Item }
