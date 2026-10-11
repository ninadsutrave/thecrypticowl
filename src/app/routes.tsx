import { createBrowserRouter, redirect } from 'react-router';
import { Root } from './pages/Root';
import { Hub } from './pages/Hub';
import { RouteError } from './pages/RouteError';

const cryptic = async () => ({ Component: (await import('./pages/Puzzle')).Puzzle });

// Root layout + the index route (the puzzle grid) ship in the initial bundle
// because they are rendered on first paint. Every game and page is
// code-split so it only loads when the user navigates to it — chess.js, for
// one, never downloads unless someone opens the chess puzzle.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    ErrorBoundary: RouteError,
    children: [
      { index: true, Component: Hub },
      { path: 'cryptic', lazy: cryptic },
      // Pre-multi-game URLs, kept so old shared links still work: /puzzle is
      // today's clue, /puzzle/42 the day clue #42 was published.
      {
        path: 'puzzle',
        loader: ({ request }) => redirect(`/cryptic${new URL(request.url).search}`),
      },
      {
        path: 'puzzle/:number',
        loader: async ({ params }) => {
          const { fetchPuzzleByNumber } = await import('../lib/supabase');
          const n = Number.parseInt(params.number ?? '', 10);
          const p = Number.isFinite(n) ? await fetchPuzzleByNumber(n) : null;
          return redirect(p?.date ? `/cryptic?date=${p.date}` : '/cryptic');
        },
      },
      {
        path: 'sudoku',
        lazy: async () => ({
          Component: (await import('./games/sudoku/SudokuGame')).SudokuGame,
        }),
      },
      {
        path: 'what-am-i',
        lazy: async () => ({
          Component: (await import('./games/whatami/WhatAmIGame')).WhatAmIGame,
        }),
      },
      {
        path: 'trivia',
        lazy: async () => ({
          Component: (await import('./games/trivia/TriviaGame')).TriviaGame,
        }),
      },
      {
        path: 'chronology',
        lazy: async () => ({
          Component: (await import('./games/chronology/ChronologyGame')).ChronologyGame,
        }),
      },
      {
        path: 'chess',
        lazy: async () => ({ Component: (await import('./games/chess/ChessGame')).ChessGame }),
      },
      {
        path: 'cryptogram',
        lazy: async () => ({
          Component: (await import('./games/cryptogram/CryptogramGame')).CryptogramGame,
        }),
      },
      {
        path: 'higher-lower',
        lazy: async () => ({
          Component: (await import('./games/higher-lower/HigherLowerGame')).HigherLowerGame,
        }),
      },
      {
        path: 'slitherlink',
        lazy: async () => ({
          Component: (await import('./games/slitherlink/SlitherlinkGame')).SlitherlinkGame,
        }),
      },
      {
        // Shikaku was briefly in the lineup; Slitherlink took its place.
        path: 'shikaku',
        loader: () => redirect('/slitherlink'),
      },
      {
        path: 'about',
        lazy: async () => ({ Component: (await import('./pages/About')).About }),
      },
      {
        path: 'learn',
        lazy: async () => ({ Component: (await import('./pages/Learn')).Learn }),
      },
      {
        path: 'tutorial',
        lazy: async () => ({ Component: (await import('./pages/Learn')).Learn }),
      },
      {
        path: 'stats',
        lazy: async () => ({ Component: (await import('./pages/Stats')).Stats }),
      },
      {
        path: 'history',
        lazy: async () => ({ Component: (await import('./pages/History')).Progress }),
      },
      {
        path: 'archive',
        lazy: async () => ({ Component: (await import('./pages/Archive')).Archive }),
      },
      {
        path: 'privacy',
        lazy: async () => ({ Component: (await import('./pages/Privacy')).Privacy }),
      },
      {
        path: 'offline',
        lazy: async () => ({ Component: (await import('./pages/NoInternet')).NoInternet }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('./pages/NotFound')).NotFound }),
      },
    ],
  },
]);
