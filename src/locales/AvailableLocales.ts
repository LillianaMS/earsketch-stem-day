export interface Locale {
    displayText: string;
    localeCode: string;
    direction: "ltr" | "rtl"
}

export const ENGLISH_LOCALE: Locale = { displayText: "English", localeCode: "en", direction: "ltr" }

const availableLocales: Locale[] = [
    ENGLISH_LOCALE,
    { displayText: "Español", localeCode: "es", direction: "ltr" },
]

export const AVAILABLE_LOCALES: { [key: string]: Locale } = Object.assign({}, ...availableLocales.map((l) => ({ [l.localeCode]: l })))
