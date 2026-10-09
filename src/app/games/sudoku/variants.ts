/**
 * The weekly variant rotation (docs/games.md § Variant Sudoku). Each day
 * keeps the normal Sudoku rules and adds one of these.
 */

export type SudokuVariant =
  | 'diagonal'
  | 'kropki'
  | 'thermo'
  | 'arrow'
  | 'sandwich'
  | 'jigsaw'
  | 'killer';

export interface VariantInfo {
  name: string;
  day: string;
  /** The extra rule, in one sentence. */
  rule: string;
  /** A tiny worked example for the rule card. */
  example: string;
}

export const VARIANTS: Record<SudokuVariant, VariantInfo> = {
  diagonal: {
    name: 'Diagonal',
    day: 'Mon',
    rule: 'Digits cannot repeat along either of the two main diagonals.',
    example: 'If the top-left corner is a 1, no other cell on that diagonal can be a 1.',
  },
  kropki: {
    name: 'Kropki',
    day: 'Tue',
    rule: 'A white dot joins two consecutive digits. A black dot joins two digits where one is double the other.',
    example: 'White dot: 4 and 5. Black dot: 3 and 6.',
  },
  thermo: {
    name: 'Thermo',
    day: 'Wed',
    rule: 'Digits strictly increase along each thermometer, starting from the bulb.',
    example: 'A three-cell thermo could read 2 → 5 → 8, but never 2 → 2 → 8.',
  },
  arrow: {
    name: 'Arrow',
    day: 'Thu',
    rule: 'The digits along an arrow add up to the digit in its circle. Digits may repeat on an arrow.',
    example: 'A circled 7 with an arrow through 3 and 4 works: 3 + 4 = 7.',
  },
  sandwich: {
    name: 'Sandwich',
    day: 'Fri',
    rule: 'A number outside the grid is the sum of the digits sandwiched between the 1 and the largest digit (6 on a 6×6 grid) in that row or column.',
    example: 'The row 4 1 2 5 6 3 has a sandwich sum of 2 + 5 = 7.',
  },
  jigsaw: {
    name: 'Jigsaw',
    day: 'Sat',
    rule: 'The boxes are irregular shapes. Each shape must still contain every digit once.',
    example: 'Follow the thick borders: they mark the shapes instead of square boxes.',
  },
  killer: {
    name: 'Killer',
    day: 'Sun',
    rule: 'The digits in each dashed cage add up to the small number in its corner. Digits cannot repeat within a cage.',
    example: 'A two-cell cage marked 3 must hold 1 and 2, in some order.',
  },
};

/** Every variant, in rotation order (shown in the tutorial). */
export const WEEKLY_ROTATION: SudokuVariant[] = [
  'diagonal',
  'kropki',
  'thermo',
  'arrow',
  'sandwich',
  'jigsaw',
  'killer',
];
