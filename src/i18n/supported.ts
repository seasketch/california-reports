export interface LangDetails {
  /** language name in English */
  name: string;
  /** language name in that language */
  localName?: string;
  /** language code, as defined in poeditor */
  code: string;
  /** is language direction right-to-left */
  rtl?: boolean;
}

export const otherLanguages: LangDetails[] = [
  { name: "Spanish", localName: "Español", code: "es" },
].sort((a, b) => a.name.localeCompare(b.name));

const languages: LangDetails[] = [
  { name: "English", localName: "English", code: "EN" },
  ...otherLanguages,
];

export default languages;
