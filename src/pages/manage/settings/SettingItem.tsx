import {
  Center,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
  Switch as HopeSwitch,
  Textarea,
} from "@hope-ui/solid"
import { TbTrash } from "solid-icons/tb"
import { For, Match, Show, Switch } from "solid-js"
import { useT } from "~/hooks"
import { Flag, SettingItem, Type } from "~/types"

export type ItemProps = SettingItem & {
  onChange?: (value: string) => void
  onDelete?: () => void
  hideLabel?: boolean
  w?: string
}

const Item = (props: ItemProps) => {
  const t = useT()
  return (
    <FormControl w={props.w ?? "100%"} display="flex" flexDirection="column">
      <Show when={!props.hideLabel}>
        <FormLabel for={props.key} display="flex" alignItems="center">
          <span>{t(`settings.${props.key}`)}</span>
          <Show when={props.flag === Flag.DEPRECATED}>
            <button
              type="button"
              class="ol-icon-btn ol-icon-btn--danger"
              style={{
                width: "24px",
                height: "24px",
                "margin-left": "6px",
              }}
              title={t("global.delete")}
              onClick={(e) => {
                e.preventDefault()
                props.onDelete?.()
              }}
            >
              <TbTrash size={14} class="ol-ico" />
            </button>
          </Show>
        </FormLabel>
      </Show>
      <Switch fallback={<Center>{t("settings_other.unknown_type")}</Center>}>
        <Match when={[Type.String, Type.Number].includes(props.type)}>
          <Input
            type={props.type === Type.Number ? "number" : ""}
            id={props.key}
            value={props.value}
            onInput={(e) => props.onChange?.(e.currentTarget.value)}
            readOnly={props.flag === Flag.READONLY}
          />
        </Match>
        <Match when={props.type === Type.Bool}>
          <HopeSwitch
            id={props.key}
            checked={props.value === "true"}
            onChange={(e: { currentTarget: HTMLInputElement }) =>
              props.onChange?.(e.currentTarget?.checked ? "true" : "false")
            }
            readOnly={props.flag === Flag.READONLY}
          />
        </Match>
        <Match when={props.type === Type.Text}>
          <Textarea
            id={props.key}
            rows={3}
            value={props.value}
            onInput={(e) => props.onChange?.(e.currentTarget.value)}
            readOnly={props.flag === Flag.READONLY}
          />
        </Match>
        <Match when={props.type === Type.Select}>
          <Select
            id={props.key}
            value={props.value}
            onChange={(e) => props.onChange?.(e)}
            readOnly={props.flag === Flag.READONLY}
          >
            <SelectTrigger>
              <SelectPlaceholder>{t("global.choose")}</SelectPlaceholder>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectContent>
              <SelectListbox>
                <For each={props.options?.split(",")}>
                  {(item) => (
                    <SelectOption value={item}>
                      <SelectOptionText>
                        {t(`settings.${props.key}s.${item}`)}
                      </SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  )}
                </For>
              </SelectListbox>
            </SelectContent>
          </Select>
        </Match>
      </Switch>
      <Show when={props.help}>
        <FormHelperText>{t(`settings.${props.key}-tips`)}</FormHelperText>
      </Show>
    </FormControl>
  )
}

export { Item }
