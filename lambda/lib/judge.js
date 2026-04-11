export function judgeClue(clueObj, lexical) {
  const errors = [];

  // 1. Basic structure checks
  if (!clueObj?.clue) errors.push("missing_clue");
  if (!clueObj?.definition) errors.push("missing_definition");
  if (!clueObj?.clue_parts || !Array.isArray(clueObj.clue_parts)) {
    errors.push("missing_clue_parts");
  }
  if (!clueObj?.hints || !Array.isArray(clueObj.hints) || clueObj.hints.length < 3) {
    errors.push("insufficient_hints");
  }

  // 2. Answer leak check
  if (
    clueObj?.clue &&
    clueObj.clue.toUpperCase().includes(lexical.answer.toUpperCase())
  ) {
    errors.push("answer_leak_in_clue");
  }

  // 3. Definition location (Ximenean: start or end ONLY)
  if (clueObj?.clue && clueObj?.definition) {
    const clueText = clueObj.clue.toLowerCase().trim();
    const defText = clueObj.definition.toLowerCase().trim();
    
    const isAtStart = clueText.startsWith(defText);
    const isAtEnd = clueText.endsWith(defText) || clueText.replace(/\s*\(\d+\)$/, "").endsWith(defText);
    
    if (!isAtStart && !isAtEnd) {
      errors.push("definition_not_at_ends");
    }
  }

  // 4. Letter count check (e.g. "Clue text (5)")
  if (clueObj?.clue) {
    const match = clueObj.clue.match(/\((\d+)\)$/);
    if (match) {
      const statedLength = parseInt(match[1], 10);
      if (statedLength !== lexical.answer.length) {
        errors.push("incorrect_letter_count_suffix");
      }
    } else {
      errors.push("missing_letter_count_suffix");
    }
  }

  // 5. Clue parts reconstruction check
  if (clueObj?.clue && clueObj?.clue_parts) {
    const combinedParts = clueObj.clue_parts.map(p => p.text).join("");
    const cleanCombined = combinedParts.replace(/\s+/g, "").toLowerCase();
    const cleanClue = clueObj.clue.replace(/\s+/g, "").toLowerCase();
    
    if (cleanCombined !== cleanClue) {
       errors.push("clue_parts_reconstruction_mismatch");
    }

    // Ensure exactly one definition in clue_parts
    const defParts = clueObj.clue_parts.filter(p => p.type === "definition");
    if (defParts.length !== 1) {
      errors.push("invalid_definition_count_in_parts");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
