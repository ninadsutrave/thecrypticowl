import { motion } from 'motion/react';
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
        'We collect minimal personal data necessary to provide a personalized experience. When you sign in using Google OAuth, we receive your email address, name, and profile picture. This information is used exclusively to identify your account, sync your puzzle progress, maintain your daily streaks, and store your solve history across different devices.',
    },
    {
      title: 'Local Storage & Persistence',
      content:
        'For users who are not signed in, all progress data (including current puzzle state, XP, and streaks) is stored locally on your device using browser localStorage. This data remains on your device and is not accessible by us until you choose to sign in and sync your account. Once authenticated, this local data is merged with your cloud profile hosted on Supabase.',
    },
    {
      title: 'Cookies & Authentication',
      content:
        'We use essential cookies and browser storage tokens to maintain your authentication session via Supabase and Google. These are strictly necessary for the site to function and do not track your activity across other websites. We do not use any third-party advertising or tracking cookies.',
    },
    {
      title: 'Third-Party Services',
      content:
        'Our backend infrastructure is powered by Supabase (a secure database-as-a-service) and Google Cloud. Your authentication is handled by Google OAuth. We encourage you to review their respective privacy policies to understand how they process your information.',
    },
    {
      title: 'Analytics',
      content:
        'We use Google Analytics to collect anonymous usage statistics (such as page views and solve rates) to help us improve the learning experience. No personally identifiable information is sent to Google Analytics.',
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
            style={{ color: isDark ? '#A78BFA' : '#7C3AED', textDecoration: 'underline' }}
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: '2.5rem',
            color: isDark ? '#C4B5FD' : '#5B21B6',
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
          Last updated: April 11, 2026. We value your privacy and aim to be as transparent as
          possible about how we handle your data.
        </p>

        <div className="flex flex-col gap-10">
          {sections.map((section, i) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
            >
              <h2
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: '1.5rem',
                  color: isDark ? '#A78BFA' : '#7C3AED',
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
            </motion.section>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
