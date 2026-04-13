/**
 * Validates the quality and structural integrity of a generated clue.
 */
export function judgeClue(clue, lexical) {
  const errors = [];

  // 1. Basic checks
  if (!clue.clue || !clue.definition) {
    errors.push("Missing core fields (clue or definition)");
  }

  // 2. Answer leak check
  if (clue.clue.toLowerCase().includes(lexical.answer.toLowerCase())) {
    errors.push("Answer leaked in clue text");
  }

  // 3. Ximenean check: definition must be at the start or end
  const clueClean = clue.clue.toLowerCase().replace(/[^\w\s]/g, "");
  const defClean = clue.definition.toLowerCase().replace(/[^\w\s]/g, "");

  if (!clueClean.startsWith(defClean) && !clueClean.endsWith(defClean)) {
    errors.push("Definition not at an extremity (non-Ximenean)");
  }

  // 4. Clue parts reconstruction
  const reconstructed = clue.clue_parts.map((p) => p.text).join("");
  if (reconstructed.replace(/\s/g, "") !== clue.clue.replace(/\s/g, "")) {
    errors.push("Clue parts do not match full clue text");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
