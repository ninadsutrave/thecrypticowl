import { useState, useEffect } from 'react';
// ─── TIMER ────────────────────────────────────────────────────────────────────

export function SolveTimer({ startTime, stopped }: { startTime: number; stopped: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (stopped || !startTime) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime, stopped]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span style={{ fontFamily: "'Fredoka One', cursive" }}>
      {m}:{s.toString().padStart(2, '0')}
    </span>
  );
}

// ─── NEXT PUZZLE COUNTDOWN ────────────────────────────────────────────────────

export function NextPuzzleCountdown({ isDark }: { isDark: boolean }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="rounded-2xl p-4 text-center border"
      style={{
        background: isDark ? '#1A0F35' : '#F5F0FF',
        borderColor: isDark ? '#3D2A6B' : '#C4B5FD',
      }}
    >
      <p
        style={{
          fontSize: '0.78rem',
          color: isDark ? '#9381CC' : '#6B7280',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        NEXT PUZZLE IN
      </p>
      <p
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: '1.8rem',
          color: '#7C3AED',
          letterSpacing: '0.04em',
        }}
      >
        {timeLeft}
      </p>
      <p
        style={{
          fontSize: '0.78rem',
          color: isDark ? '#9381CC' : '#6B7280',
          fontWeight: 600,
          marginTop: 2,
        }}
      >
        Come back tomorrow for #43 🦉
      </p>
    </div>
  );
}
