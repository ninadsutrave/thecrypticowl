/**
 * Piece images: the Chessnut set by Alexis Luengas (Apache License 2.0,
 * public/pieces/LICENSE.txt). One SVG per piece, e.g. /pieces/wK.svg.
 */
export function pieceSrc(cell: { color: 'w' | 'b'; type: string }) {
  return `/pieces/${cell.color}${cell.type.toUpperCase()}.svg`;
}
