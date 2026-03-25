import { Box, Heading, Text, VStack } from "@hope-ui/solid"

const Index = () => {
  return (
    <Box bg="$neutral2" minH="260vh" px="$8" py="$12">
      <VStack alignItems="stretch" gap="$6" maxW="$4xl" mx="auto">
        <Heading>Matomo Scroll Test</Heading>
        <Text>
          这个页面用于验证广告曝光。先打开开发者工具网络面板，再向下滚动到广告卡片。
        </Text>
        <Text>
          如果 Matomo
          埋点生效，广告进入可视区域时应该发出一次内容曝光请求，点击时再发一次交互请求。
        </Text>
        <Box h="140vh" rounded="$xl" bg="white" p="$8" shadow="$md">
          <Text>滚动到页面下方的广告区域。</Text>
        </Box>
        <Box
          data-track-content=""
          data-content-name="顶部广告"
          data-content-piece="DZMM"
          bg="white"
          rounded="$2xl"
          shadow="$xl"
          p="$6"
        >
          <Box display="flex" gap="$6" alignItems="center">
            <a
              href="https://www.turfle.top?rf=386f33f0"
              data-content-target="https://www.turfle.top?rf=386f33f0"
              target="_self"
              rel="noreferrer"
            >
              <img
                src="https://p.inari.site/guest/25-11/11/69132117c20ac.png"
                alt="DZMM"
                width="300"
                style={{ display: "block", "border-radius": "16px" }}
              />
            </a>
            <Box>
              <Heading size="lg" mb="$3">
                <a
                  href="https://www.turfle.top?rf=386f33f0"
                  data-content-target="https://www.turfle.top?rf=386f33f0"
                  target="_self"
                  rel="noreferrer"
                >
                  DZMM - 中文AI角色扮演平台
                </a>
              </Heading>
              <Text>
                这是测试广告块。进入视口时应触发 impression，请求里会带上
                content name 和 piece。
              </Text>
            </Box>
          </Box>
        </Box>
      </VStack>
    </Box>
  )
}

export default Index
