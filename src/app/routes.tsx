import { createBrowserRouter } from 'react-router';
import { Root } from './pages/Root';
import { Home } from './pages/Home';
import { Learn } from './pages/Learn';
import { Puzzle } from './pages/Puzzle';
import { History } from './pages/History';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'learn', Component: Learn },
      { path: 'puzzle', Component: Puzzle },
      { path: 'puzzle/:number', Component: Puzzle },
      { path: 'history', Component: History },
    ],
  },
]);
