import {
  Button,
  HStack,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@hope-ui/solid"
import { TbTrash } from "solid-icons/tb"
import { useT } from "~/hooks"

export interface DeletePopoverProps {
  name: string
  loading?: boolean
  onClick: () => void
}

export const DeletePopover = (props: DeletePopoverProps) => {
  const t = useT()
  return (
    <Popover>
      {({ onClose }) => (
        <>
          <PopoverTrigger as={Button} colorScheme="danger">
            <TbTrash
              size={14}
              class="ol-ico"
              style={{ "margin-right": "4px" }}
            />
            {t("global.delete")}
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverHeader>
              {t("global.delete_confirm", {
                name: props.name,
              })}
            </PopoverHeader>
            <PopoverBody>
              <HStack spacing="$2" justifyContent="flex-end">
                <Button onClick={onClose} colorScheme="neutral">
                  {t("global.cancel")}
                </Button>
                <Button
                  colorScheme="danger"
                  loading={props.loading}
                  onClick={props.onClick}
                >
                  {t("global.confirm")}
                </Button>
              </HStack>
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  )
}
