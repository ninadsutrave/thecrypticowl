import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';

/**
 * A centred dialog over a dimmed page. Closes on Escape, on the backdrop and
 * on the close button; locks page scroll and takes focus while open.
 *
 * Deliberately no entrance animation: a dialog that starts at opacity 0 is
 * invisible wherever animation frames are throttled.
 */
export function Modal({
  open,
  onClose,
  label,
  children,
  maxWidth = 480,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  children: ReactNode;
  maxWidth?: number;
}) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portalled to <body>: inside an animated (transformed) page, `fixed`
  // would be relative to that container, pushing the dialog down the page
  // and leaving the navbar undimmed.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(13, 8, 32, 0.6)', backdropFilter: 'blur(3px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="relative w-full rounded-3xl border-2 shadow-2xl outline-none max-h-[90vh] overflow-y-auto"
        style={{
          maxWidth,
          background: T.cardBg,
          borderColor: T.cardBorderStrong,
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-full"
          style={{ color: T.textMuted, background: T.inputBg }}
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
