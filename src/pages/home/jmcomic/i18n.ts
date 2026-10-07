import { currentLang } from "~/app/i18n"
import en from "~/lang/en/jmcomic.json"
import zh from "./jmcomic_zh.json"

export const useJMTranslation =
  () =>
  (key: string): string => {
    const dictionary = String(currentLang()).toLowerCase().startsWith("zh")
      ? zh
      : en
    return dictionary[key as keyof typeof en] ?? key
  }
