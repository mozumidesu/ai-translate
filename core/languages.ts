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
const GREEK: Writing = { script: ["Greek"], cased: true, closing: { ";": "?", "\u037e": "?" } };
// U+0589, the Armenian full stop.
const ARMENIAN: Writing = { script: ["Armenian"], cased: true, closing: { "\u0589": "." } };

const GEORGIAN: Writing = { script: ["Georgian"], cased: false, closing: {} };
const HEBREW: Writing = { script: ["Hebrew"], cased: false, closing: {} };

// U+061F, the Arabic question mark; U+06D4, the full stop Urdu closes with.
const ARABIC: Writing = { script: ["Arabic"], cased: false, closing: { "\u061f": "?" } };
const URDU: Writing = { ...ARABIC, closing: { "\u061f": "?", "\u06d4": "." } };

// U+0964 and U+0965, the danda and the double danda: Hindi's and Bengali's full stop.
const DANDA = { "\u0964": ".", "\u0965": "." } as const;
const DEVANAGARI: Writing = { script: ["Devanagari"], cased: false, closing: DANDA };
const BENGALI: Writing = { script: ["Bengali"], cased: false, closing: DANDA };

const TAMIL: Writing = { script: ["Tamil"], cased: false, closing: {} };
const THAI: Writing = { script: ["Thai"], cased: false, closing: {} };
const HANGUL: Writing = { script: ["Hangul"], cased: false, closing: {} };

// The full stop and the full-width question and exclamation marks of Chinese and Japanese.
const FULLWIDTH = { "\u3002": ".", "\uff61": ".", "\uff1f": "?", "\uff01": "!" } as const;
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

const SCRIPTS = [...new Set(ALL.flatMap(l => l.script))];

/** The alphabet a letter is in, if some language here is written in it. */
const scriptOf = (letter: string) => SCRIPTS.find(script => lettersOf([script]).test(letter));

/** The alphabet most of a text's letters are in. */
function mostlyIn(text: string) {
    const counted = new Map<Script, number>();

    for (const letter of text.match(/\p{L}/gu) ?? []) {
        const script = scriptOf(letter);
        if (script) counted.set(script, (counted.get(script) ?? 0) + 1);
    }

    return [...counted].sort((a, b) => b[1] - a[1])[0]?.[0];
}

const CASED = new Set(ALL.filter(l => l.cased).flatMap(l => l.script));

/**
 * Whether a letter is in an alphabet whose capitals people type. Unicode
 * gives Georgian some, so upper-casing a Georgian letter makes one that
 * nobody has on a keyboard; that is not a capital, and nor is a letter of an
 * alphabet no language here is written in.
 */
export const hasCase = (letter: string) => {
    const script = scriptOf(letter);
    return !!script && CASED.has(script);
};

/** The marks every text can close on, and what they stand for. */
const COMMON: Record<string, string> = { ".": ".", "?": "?", "!": "!", "…": "..." };

const marksOf = (keep: (mark: string) => boolean) =>
    ALL.flatMap(l => Object.entries(l.closing).filter(([mark]) => keep(mark)).map(([mark, plain]) => ({ language: l, mark, plain })));

/** Marks that no other language writes as anything else, so any text can close on them. */
const ALWAYS = new Map([...Object.entries(COMMON), ...marksOf(mark => mark.charCodeAt(0) > 0x7f).map(m => [m.mark, m.plain] as const)]);

/** Marks that are ordinary punctuation in the rest, the Greek ";": each closes a text only in its own language. */
const ORDINARY = marksOf(mark => mark.charCodeAt(0) <= 0x7f);

/**
 * How a text closes: the run of marks it ends on, and the same run in plain
 * marks, so that a full-width "。" and Hindi's "।" are both the full stop they
 * are. `language` is the one the text is in, when that is known, as an answer's
 * is; a text that is not says by its letters, which are only read when it ends
 * on a mark that needs them.
 */
export function closingOf(text: string, language?: string) {
    const own = language === undefined ? undefined : languageNamed(language);
    let alphabet: string | undefined;

    /** What a mark stands for as the end of this text, or nothing when it does not close it. */
    const plainOf = (mark: string) => {
        const always = ALWAYS.get(mark);
        if (always !== undefined) return always;

        const ours = ORDINARY.filter(m => m.mark === mark);
        if (!ours.length) return undefined;

        if (!own && alphabet === undefined) alphabet = mostlyIn(text) ?? "";
        return ours.find(m => own ? own === m.language : m.language.script.includes(alphabet as Script))?.plain;
    };

    const chars = [...text];
    const run: string[] = [];
    const plain: string[] = [];

    for (let at = chars.length - 1; at >= 0; at--) {
        const stands = plainOf(chars[at]);
        if (stands === undefined) break;

        run.unshift(chars[at]);
        plain.unshift(stands);
    }

    return { run: run.join(""), plain: plain.join("") };
}

const PLAIN = new Map(ALL.flatMap(l => Object.entries(l.closing)));

/**
 * A run of closing marks as it is written into a text in `language`. A mark
 * every text has stays, and so does one that language has of its own; any other
 * is the plain mark it stands for, since a danda has no place in an English
 * sentence and nor has a full-width full stop.
 */
export function closeIn(language: string, run: string) {
    const own = languageNamed(language)?.closing ?? {};
    return [...run].map(mark => (mark in COMMON || mark in own ? mark : PLAIN.get(mark) ?? mark)).join("");
}

const whole = new Map<Script, RegExp>();

/** A pattern for a word written wholly in one alphabet. */
function wholly(script: Script) {
    let pattern = whole.get(script);
    if (!pattern) whole.set(script, pattern = new RegExp(`^[\\p{Script=${script}}\\p{M}]+$`, "u"));
    return pattern;
}

/**
 * Whether these words are written in one and the same alphabet, and it is one
 * the language is written in. An ending continues its word, so a Japanese word
 * with its reading in brackets, which is two alphabets, has none, and nor does
 * a Latin identifier in a Russian answer.
 */
export function writtenIn(language: string, ...words: string[]) {
    return (languageNamed(language)?.script ?? LATIN.script)
        .some(script => words.every(word => wholly(script).test(word)));
}
