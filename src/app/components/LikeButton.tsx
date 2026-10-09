import { useEffect, useRef, useState } from 'react';
import { m } from 'motion/react';
import { Heart } from 'lucide-react';
import { getTheme } from '../theme';
import { addAppLike, fetchAppLikesCount, isSupabaseConfigured } from '../../lib/supabase';
import { StoreKeys, readRaw, writeRaw } from '../lib/localStore';

export function LikeButton({ isDark }: { isDark: boolean }) {
  const [liked, setLiked] = useState(() => {
    return readRaw(StoreKeys.appLiked) === 'true';
  });
  const [totalLikes, setTotalLikes] = useState(0);
  const T = getTheme(isDark);
  const ref = useRef<HTMLButtonElement>(null);

  // The count lives in the footer, and fetching it loads the Supabase SDK
  // (~58 KB). Waiting until the footer is on screen keeps that download
  // from competing with first paint on a slow phone connection.
  useEffect(() => {
    if (!isSupabaseConfigured || !ref.current) return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        io.disconnect();
        fetchAppLikesCount().then(setTotalLikes);
      }
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const toggleLike = async () => {
    if (liked) return; // Disable unlike

    setLiked(true);
    writeRaw(StoreKeys.appLiked, 'true');

    if (isSupabaseConfigured) {
      setTotalLikes(prev => prev + 1);
      await addAppLike();
    }
  };

  const activePurple = T.brand;

  return (
    <m.button
      ref={ref}
      onClick={toggleLike}
      whileHover={!liked ? { scale: 1.05 } : {}}
      whileTap={!liked ? { scale: 0.95 } : {}}
      disabled={liked}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all"
      style={{
        background: liked ? (isDark ? '#2D1B69' : '#F5F0FF') : 'transparent',
        borderColor: liked ? activePurple : T.navBorder,
        color: liked ? activePurple : T.text,
        cursor: liked ? 'default' : 'pointer',
      }}
    >
      <Heart size={14} fill={liked ? activePurple : 'none'} />
      <span style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>
        {liked ? 'Liked!' : 'Like us'}
        <span
          className="ml-1.5 px-1.5 py-0.5 rounded-full text-[0.65rem] font-black"
          style={{
            background: isDark ? '#1A1035' : liked ? 'white' : '#EDE9FE',
            color: activePurple,
          }}
        >
          {totalLikes}
        </span>
      </span>
    </m.button>
  );
}
