import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';
import { watchForStaleBuild } from './app/staleBuild';

watchForStaleBuild();

createRoot(document.getElementById('root')!).render(<App />);
