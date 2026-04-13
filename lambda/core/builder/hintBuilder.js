import { MECHANISM_DESCRIPTIONS, DEFAULT_HINT_STYLES } from "../../constants/clue.js";

/**
 * Constructs the progressive hint cards for the interactive UI.
 */
export function constructHints(lexical, clue) {
  const isDoubleDef = lexical.type === "double_definition";

  let baseHints;

  if (isDoubleDef) {
    baseHints = [
      {
        id: 1,
        title: "First Definition",
        text: `The first part of the clue is a definition for the answer.`,
        highlight: clue.definition,
        mascot_comment: "Double definitions are sneaky! One definition is at the start...",
      },
      {
        id: 2,
        title: "Second Definition",
        text: `The other end of the clue is also a definition for the same answer.`,
        highlight: clue.indicator,
        mascot_comment: "...and the other is at the end! No wordplay here. 🦉",
      },
      {
        id: 3,
        title: "First Context",
        text: `Think of a word that fits the first definition: "${clue.definition}".`,
        mascot_comment: "Focus on one side first...",
      },
      {
        id: 4,
        title: "Second Context",
        text: `That same word must also fit the second definition: "${clue.indicator}".`,
        mascot_comment: "Does it fit both? Then you've found it! 🎯",
      },
    ];
  } else {
    baseHints = [
      {
        id: 1,
        title: "Definition Location",
        text: `The definition is at the ${
          clue.clue.toLowerCase().startsWith(clue.definition.toLowerCase()) ? "start" : "end"
        } of the clue.`,
        highlight: clue.definition,
        mascot_comment: "Found the definition! It's always at one of the ends. 👀",
      },
      {
        id: 2,
        title: "The Indicator",
        text: clue.indicator
          ? `The indicator word is "${clue.indicator}", which signals how the wordplay works.`
          : `Look for a hidden signal word that tells you what to do with the letters.`,
        highlight: clue.indicator || null,
        mascot_comment: "Indicators are like road signs—they tell you which way to go!",
      },
      {
        id: 3,
        title: "The Fodder",
        text: clue.fodder
          ? `The raw letters or synonym to work with is "${clue.fodder}".`
          : "Look closely at the letters in the clue...",
        highlight: clue.fodder || null,
        mascot_comment: "We've got the ingredients, now let's cook! 🍳",
      },
      {
        id: 4,
        title: "Wordplay Type",
        text: `This is a ${lexical.type.replace("_", " ")} clue. In this type, ${
          MECHANISM_DESCRIPTIONS[lexical.type] || "parts are combined to form the answer."
        }`,
        mascot_comment: "The final piece of the puzzle! Can you see it now? 🦉",
      },
    ];
  }

  // Apply standard styles to all hints
  return baseHints.map((h) => ({
    ...h,
    ...DEFAULT_HINT_STYLES,
  }));
}
