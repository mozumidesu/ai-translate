/*
 * AI Translate — the languages.
 *
 * One record for each: the names the dropdown shows, and what the core needs to
 * know about how the language is written, which is the alphabet it is in,
 * whether it has capitals and which marks it closes a sentence with. The core
 * reads those and never guesses from a language's English name. Adding a
 * language is adding one row below.
 *
 * "value" goes into the prompt, so it is the English name. "code" is what the
 * system uses to render that name in the interface language.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** An alphabet, by the name Unicode gives it: the X of \p{Script=X}. */
export type Script = "Latin" | "Cyrillic" | "Greek" | "Armenian" | "Georgian" | "Hebrew" | "Arabic"
    | "Devanagari" | "Bengali" | "Tamil" | "Thai" | "Hangul" | "Han" | "Hiragana" | "Katakana";

/** How a language is written, apart from its words. */
export interface Writing {
    /** The alphabets its text is in. An answer in none of them was not written in it. */
    readonly script: readonly Script[];
    /** Whether it has capitals that people type. Georgian has them in Unicode, and nobody types them. */
    readonly cased: boolean;
    /** The marks it closes a sentence with besides . ? ! and …, each with the plain mark it stands for. */
    readonly closing: Readonly<Record<string, "." | "?" | "!">>;
}

export interface Language extends Writing {
    value: string;
    label: string;
    code: string;
}

// What a row says when it names no writing: the Latin alphabet, which is most of them.
const LATIN: Writing = { script: ["Latin"], cased: true, closing: {} };
const CYRILLIC: Writing = { ...LATIN, script: ["Cyrillic"] };

// U+037E is the Greek question mark proper, which Unicode folds into the semicolon,
// so both are written. The semicolon is only that in Greek: see closingOf.
const GREEK: Writing = { script: ["Greek"], cased: true, closing: { ";": "?", ";": "?" } };
// U+0589, the Armenian full stop.
const ARMENIAN: Writing = { script: ["Armenian"], cased: true, closing: { "։": "." } };

const GEORGIAN: Writing = { script: ["Georgian"], cased: false, closing: {} };
const HEBREW: Writing = { script: ["Hebrew"], cased: false, closing: {} };

// U+061F, the Arabic question mark; U+06D4, the full stop Urdu closes with.
const ARABIC: Writing = { script: ["Arabic"], cased: false, closing: { "؟": "?" } };
const URDU: Writing = { ...ARABIC, closing: { "؟": "?", "۔": "." } };

// U+0964 and U+0965, the danda and the double danda: Hindi's and Bengali's full stop.
const DANDA = { "।": ".", "॥": "." } as const;
const DEVANAGARI: Writing = { script: ["Devanagari"], cased: false, closing: DANDA };
const BENGALI: Writing = { script: ["Bengali"], cased: false, closing: DANDA };

const TAMIL: Writing = { script: ["Tamil"], cased: false, closing: {} };
const THAI: Writing = { script: ["Thai"], cased: false, closing: {} };
const HANGUL: Writing = { script: ["Hangul"], cased: false, closing: {} };

// The full stop and the full-width question and exclamation marks of Chinese and Japanese.
const FULLWIDTH = { "。": ".", "｡": ".", "？": "?", "！": "!" } as const;
const CHINESE: Writing = { script: ["Han"], cased: false, closing: FULLWIDTH };
const JAPANESE: Writing = { script: ["Han", "Hiragana", "Katakana"], cased: false, closing: FULLWIDTH };

type Row = [value: string, native: string, code: string, writing?: Writing];

function record([value, native, code, writing = LATIN]: Row): Language {
    return { ...writing, value, code, label: value === native ? value : `${value} — ${native}` };
}

export const LANGUAGES: Language[] = ([
    ["Romanian", "Română", "ro"],
    ["Russian", "Русский", "ru", CYRILLIC],
    ["English", "English", "en"],
    ["Ukrainian", "Українська", "uk", CYRILLIC],
    ["Belarusian", "Беларуская", "be", CYRILLIC],
    ["Polish", "Polski", "pl"],
    ["German", "Deutsch", "de"],
    ["French", "Français", "fr"],
    ["Spanish", "Español", "es"],
    ["Italian", "Italiano", "it"],
    ["Portuguese", "Português", "pt"],
    ["Brazilian Portuguese", "Português do Brasil", "pt-BR"],
    ["Dutch", "Nederlands", "nl"],
    ["Turkish", "Türkçe", "tr"],
    ["Greek", "Ελληνικά", "el", GREEK],
    ["Bulgarian", "Български", "bg", CYRILLIC],
    ["Serbian", "Српски", "sr", CYRILLIC],
    ["Croatian", "Hrvatski", "hr"],
    ["Bosnian", "Bosanski", "bs"],
    ["Slovenian", "Slovenščina", "sl"],
    ["Macedonian", "Македонски", "mk", CYRILLIC],
    ["Albanian", "Shqip", "sq"],
    ["Czech", "Čeština", "cs"],
    ["Slovak", "Slovenčina", "sk"],
    ["Hungarian", "Magyar", "hu"],
    ["Swedish", "Svenska", "sv"],
    ["Norwegian", "Norsk", "no"],
    ["Danish", "Dansk", "da"],
    ["Finnish", "Suomi", "fi"],
    ["Icelandic", "Íslenska", "is"],
    ["Estonian", "Eesti", "et"],
    ["Latvian", "Latviešu", "lv"],
    ["Lithuanian", "Lietuvių", "lt"],
    ["Hebrew", "עברית", "he", HEBREW],
    ["Arabic", "العربية", "ar", ARABIC],
    ["Persian", "فارسی", "fa", ARABIC],
    ["Hindi", "हिन्दी", "hi", DEVANAGARI],
    ["Bengali", "বাংলা", "bn", BENGALI],
    ["Urdu", "اردو", "ur", URDU],
    ["Tamil", "தமிழ்", "ta", TAMIL],
    ["Indonesian", "Bahasa Indonesia", "id"],
    ["Malay", "Bahasa Melayu", "ms"],
    ["Thai", "ไทย", "th", THAI],
    ["Vietnamese", "Tiếng Việt", "vi"],
    ["Chinese (Simplified)", "简体中文", "zh-Hans", CHINESE],
    ["Chinese (Traditional)", "繁體中文", "zh-Hant", CHINESE],
    ["Japanese", "日本語", "ja", JAPANESE],
    ["Korean", "한국어", "ko", HANGUL],
    ["Georgian", "ქართული", "ka", GEORGIAN],
    ["Armenian", "Հայերեն", "hy", ARMENIAN],
    ["Azerbaijani", "Azərbaycan", "az"],
    ["Kazakh", "Қазақша", "kk", CYRILLIC],
    ["Uzbek", "Oʻzbekcha", "uz"],
    ["Catalan", "Català", "ca"],
    ["Basque", "Euskara", "eu"],
    ["Galician", "Galego", "gl"],
    ["Irish", "Gaeilge", "ga"],
    ["Welsh", "Cymraeg", "cy"],
    ["Maltese", "Malti", "mt"],
    ["Filipino", "Filipino", "fil"],
    ["Swahili", "Kiswahili", "sw"],
    ["Afrikaans", "Afrikaans", "af"],
    ["Esperanto", "Esperanto", "eo"],
    ["Latin", "Latina", "la"]
] as Row[]).map(record);

/**
 * Languages that are not offered in the dropdown, and are known all the same:
 * the setting that holds the language is free text, and one of these may be in
 * it. Offering one is moving its row up.
 */
export const UNLISTED: Language[] = ([
    ["Mongolian", "Монгол", "mn", CYRILLIC],
    ["Pashto", "پښتو", "ps", ARABIC],
    ["Yiddish", "ייִדיש", "yi", HEBREW],
    ["Marathi", "मराठी", "mr", DEVANAGARI],
    ["Nepali", "नेपाली", "ne", DEVANAGARI]
] as Row[]).map(record);

const ALL = [...LANGUAGES, ...UNLISTED];

/**
 * The record of the language a name stands for. The name is the one the prompt
 * writes ("Chinese (Traditional)"); a looser one typed by hand is read too, as
 * the name without its brackets ("Chinese") or as a known name followed by
 * something that is not more letters ("English (UK)", "Arabic Egyptian"), but
 * never as one that merely begins like it: "Malayalam" is not "Malay".
 */
export function languageNamed(name: string): Language | undefined {
    const said = name.trim().toLowerCase();
    const named = (l: Language) => l.value.toLowerCase();

    return ALL.find(l => named(l) === said)
        ?? ALL.find(l => named(l).replace(/ \(.*\)$/, "") === said)
        ?? ALL.find(l => said.startsWith(named(l)) && !/\p{L}/u.test(said.charAt(named(l).length)));
}

const patterns = new Map<string, RegExp>();

/** A pattern for one letter of any of these alphabets. */
function lettersOf(scripts: readonly Script[]) {
    const key = scripts.join("|");
    let pattern = patterns.get(key);
    if (!pattern) patterns.set(key, pattern = new RegExp(scripts.map(s => `\\p{Script=${s}}`).join("|"), "u"));
    return pattern;
}

/**
 * The letters an answer into a language is written in, as a pattern for one of
 * them: the cheapest test for a translation that never happened. A name the
 * list does not know is taken to be written in Latin letters.
 */
export const scriptPattern = (language: string) => lettersOf(languageNamed(language)?.script ?? LATIN.script);
