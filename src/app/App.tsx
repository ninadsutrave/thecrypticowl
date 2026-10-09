import { RouterProvider } from 'react-router';
import { LazyMotion } from 'motion/react';
import { router } from './routes';
import { DarkModeProvider } from './context/DarkModeContext';
import { AuthProvider } from './context/AuthContext';

// LazyMotion + domAnimation loads the smaller feature set (~25 KB) instead of
// the full `motion.*` feature package (~130 KB), and loads it *after* first
// paint: the features are a separate chunk fetched on demand. All children
// use `m.*` primitives — `strict` would fail the build if any `motion.*`
// slipped back in.
const loadMotionFeatures = () => import('./motionFeatures').then(m => m.default);

export default function App() {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <DarkModeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </DarkModeProvider>
    </LazyMotion>
  );
}
