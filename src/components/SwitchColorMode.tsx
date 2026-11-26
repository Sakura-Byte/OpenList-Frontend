import { Icon, useColorMode, useColorModeValue } from "@hope-ui/solid"
import { TbMoon, TbSun } from "solid-icons/tb"
import { toggleThemeWithTransition } from "~/utils/theme_sync"

const SwitchColorMode = () => {
  const { toggleColorMode } = useColorMode()
  const icon = useColorModeValue(
    {
      size: "$8",
      component: TbMoon,
      p: "$0_5",
    },
    {
      size: "$8",
      component: TbSun,
      p: "$0_5",
    },
  )
  return (
    <Icon
      cursor="pointer"
      boxSize={icon().size}
      as={icon().component}
      class="ol-ico"
      onClick={() => toggleThemeWithTransition(toggleColorMode)}
      p={icon().p}
    />
  )
}
export { SwitchColorMode }
