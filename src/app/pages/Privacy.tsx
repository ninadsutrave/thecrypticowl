import { m } from 'motion/react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';

export function Privacy() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);

  const sections = [
    {
      title: 'Introduction',
      content:
        'Welcome to The Cryptic Owl. We are committed to protecting your personal information and your right to privacy. This policy explains how we collect, use, and safeguard your data when you use our website.',
    },
    {
      title: 'Data Collection',
      content:
        'We collect minimal personal data necessary to provide a personalized experience. When you sign in using Google OAuth, we receive your email address, name, and profile picture. This information is used exclusively to identify your account, sync your puzzle progress, maintain your daily streaks, and store your play history across different devices.',
    },
    {
      title: 'Play History',
      content:
        'For each daily puzzle you finish we record the date, the game, whether you solved it, how long it took, and how many hints and mistakes you used. This powers your Stats page, streaks and personal bests. It is kept on your device, and when you are signed in it is also saved to your account so it follows you between devices. We never sell it or use it for advertising.',
    },
    {
      title: 'Local Storage & Persistence',
      content:
        'For users who are not signed in, all progress data (including the state of a puzzle in progress, timers, XP, streaks and play history) is stored locally on your device using browser localStorage. This data remains on your device and is not accessible by us until you choose to sign in. Once authenticated, this local data is merged with your account hosted on Supabase.',
    },
    {
      title: 'How Puzzles Are Made',
      content:
        'The daily puzzles are generated on our servers ahead of time, using public sources such as Wikipedia, Wikidata, and the Lichess puzzle database, with help from an AI model for some games. Your browser only talks to our own site and database while you play: none of these sources receive any information about you. Our fonts are also served from our own site rather than a third-party font service.',
    },
    {
      title: 'Cookies & Authentication',
      content:
        'We use essential cookies and browser storage tokens to maintain your authentication session via Supabase and Google, and to remember your theme preference. These are strictly necessary for the site to function. We do not use any advertising cookies, and we do not sell or share your data with advertisers. We do use Google Analytics, which sets its own cookies — see the Analytics section below.',
    },
    {
      title: 'Third-Party Services',
      content:
        'Our backend infrastructure is powered by Supabase (a secure database-as-a-service) and Google Cloud. Your authentication is handled by Google OAuth. We encourage you to review their respective privacy policies to understand how they process your information.',
    },
    {
      title: 'Analytics',
      content:
        'We use Google Analytics to collect aggregate usage statistics — page views, which puzzles are solved, and how many hints are typically needed — to help us improve the learning experience. Google Analytics sets its own cookies (such as _ga) to distinguish visitors between sessions. We do not send your name, email address or solve history to Google Analytics. Analytics only loads after your first interaction with the page, so simply opening the site and leaving loads nothing. You can block it with any standard browser privacy setting or extension without affecting the puzzle.',
    },
    {
      title: 'Your Choices',
      content:
        'You can play without an account: your streak, XP and play history stay on your device and are never sent to us. Signing out clears that local data from the device. If you have signed in and would like your account and its history deleted, email us and we will remove it.',
    },
    {
      title: 'Contact',
      content: (
        <>
          If you have any questions, concerns, or requests regarding your data, please contact Ninad
          Sutrave at ninadsutrave@gmail.com or visit{' '}
          <a
            href="https://ninadsutrave.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: T.brand, textDecoration: 'underline' }}
          >
            ninadsutrave.in
          </a>
          .
        </>
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '2.5rem',
            color: T.brandStrong,
            marginBottom: '1rem',
          }}
        >
          Privacy Policy
        </h1>
        <p
          style={{
            fontSize: '1.1rem',
            color: T.textMuted,
            marginBottom: '3rem',
            lineHeight: 1.6,
          }}
        >
          Last updated: October 10, 2026. We value your privacy and aim to be as transparent as
          possible about how we handle your data.
        </p>

        <div className="flex flex-col gap-10">
          {sections.map((section, i) => (
            <m.section
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
            >
              <h2
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.5rem',
                  color: T.brand,
                  marginBottom: '0.75rem',
                }}
              >
                {section.title}
              </h2>
              <p
                style={{
                  fontSize: '1rem',
                  color: T.text,
                  lineHeight: 1.7,
                }}
              >
                {section.content}
              </p>
            </m.section>
          ))}
        </div>
      </m.div>
    </div>
  );
}
