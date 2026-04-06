import { RouterProvider } from 'react-router';
import { router } from './routes';
import { DarkModeProvider } from './context/DarkModeContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </DarkModeProvider>
  );
}
