export const AUTHOR_MAP = {
  gemini: "7211516e-e61b-410a-b31c-6a1651515151",
  openai: "0921516e-e61b-410a-b31c-6a1651515151",
  claude: "1211516e-e61b-410a-b31c-6a1651515151",
  huggingface: "5211516e-e61b-410a-b31c-6a1651515151",
};

export const MECHANISM_DESCRIPTIONS = {
  anagram: "the letters are being rearranged (scrambled).",
  reversal: "the letters are written backwards.",
  container: "one set of letters is placed inside another.",
  hidden: "the answer is hidden across the words of the clue.",
  deletion: "one or more letters are removed from a word.",
  initial_letters: "the first letters of consecutive words spell the answer.",
  final_letters: "the last letters of consecutive words spell the answer.",
  alternating_letters: "alternate letters (odd or even) of a word or phrase spell the answer.",
  spoonerism: "the initial sounds of two words are swapped, Reverend-Spooner style.",
  charade: "two or more parts are joined together side-by-side.",
  homophone: "the answer sounds like another word.",
  cryptic_definition: "the whole clue is a punny or metaphorical definition.",
  andlit: "the whole clue is both the definition and the wordplay!",
  compound: "multiple mechanisms are combined together.",
};

export const DEFAULT_HINT_STYLES = {
  color: "#7C3AED",
  bg: "#F5F3FF",
  bg_dark: "#1A0F35",
  border: "#C4B5FD",
};
