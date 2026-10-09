import { createBrowserRouter, redirect } from 'react-router';
import { Root } from './pages/Root';
import { Hub } from './pages/Hub';

const cryptic = async () => ({ Component: (await import('./pages/Puzzle')).Puzzle });

// Root layout + the index route (the puzzle grid) ship in the initial bundle
// because they are rendered on first paint. Every game and page is
// code-split so it only loads when the user navigates to it — chess.js, for
// one, never downloads unless someone opens the chess puzzle.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Hub },
      { path: 'cryptic', lazy: cryptic },
      // Pre-multi-game URLs: shared links and the archive still use these.
      { path: 'puzzle', lazy: cryptic },
      { path: 'puzzle/:number', lazy: cryptic },
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
        // The old cryptic-only landing page; the puzzle grid replaced it.
        path: 'about',
        loader: () => redirect('/'),
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
        path: 'privacy',
        lazy: async () => ({ Component: (await import('./pages/Privacy')).Privacy }),
      },
      {
        path: 'submit',
        lazy: async () => ({ Component: (await import('./pages/SubmitClue')).SubmitClue }),
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
