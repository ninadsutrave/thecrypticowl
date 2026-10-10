import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';

/** Links into the Learn page's tabs, for the end of the cryptic walkthrough. */
export function KnowMoreLinks({ items }: { items: { to: string; label: string }[] }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  return (
    <ul className="list-none p-0 m-0 grid gap-1.5 w-full max-w-[300px]">
      {items.map(item => (
        <li key={item.to}>
          <Link
            to={item.to}
            className="flex items-center justify-between min-h-[40px] rounded-xl border px-3 py-2 text-sm font-extrabold no-underline"
            style={{ borderColor: T.brandBorder, color: T.brandText, background: T.brandSurface }}
          >
            {item.label} <ChevronRight size={14} aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
