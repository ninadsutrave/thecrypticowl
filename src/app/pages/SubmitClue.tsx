import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Send, ArrowLeft, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { submitClue, type ClueWordplayType } from '../../lib/supabase';
import { Mascot } from '../components/Mascot';

const WORDPLAY_TYPES: { id: ClueWordplayType; label: string }[] = [
  { id: 'anagram', label: 'Anagram' },
  { id: 'charade', label: 'Charade' },
  { id: 'container', label: 'Container' },
  { id: 'hidden', label: 'Hidden Word' },
  { id: 'reversal', label: 'Reversal' },
  { id: 'homophone', label: 'Homophone' },
  { id: 'deletion', label: 'Deletion' },
  { id: 'double_definition', label: 'Double Definition' },
  { id: 'cryptic_definition', label: 'Cryptic Definition' },
];

export function SubmitClue() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { user, isSignedIn } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    clue_text: '',
    answer: '',
    answer_pattern: '',
    primary_type: 'anagram' as ClueWordplayType,
    definition_text: '',
    wordplay_summary: '',
    fodder: '',
    indicator: '',
    explanation: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) {
    navigate('/history');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);

    try {
      const ok = await submitClue(user.id, formData);
      if (ok) {
        setSuccess(true);
        setTimeout(() => navigate('/history'), 3000);
      } else {
        setError('Failed to submit. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const inputStyle = {
    background: T.inputBg,
    borderColor: T.cardBorder,
    color: T.text,
    fontFamily: "'Nunito', sans-serif",
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: T.pageBg }}>
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 text-sm font-bold mb-6 hover:opacity-70 transition-opacity"
          style={{ color: isDark ? '#A78BFA' : '#7C3AED' }}
        >
          <ArrowLeft size={16} />
          Back to History
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border p-6 md:p-8"
          style={{ background: T.cardBg, borderColor: T.cardBorder }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: isDark ? '#261845' : '#F5F3FF' }}
            >
              <Send size={24} style={{ color: '#7C3AED' }} />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: '1.5rem',
                  color: isDark ? '#F0EAFF' : '#1E1B4B',
                  margin: 0,
                }}
              >
                Submit a Clue
              </h1>
              <p style={{ color: T.textMuted, fontSize: '0.9rem', margin: 0 }}>
                Our team will review your submission for the daily puzzle.
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="flex justify-center mb-6">
                  <Mascot mood="celebrating" size={120} />
                </div>
                <h2
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: '1.5rem',
                    color: '#10B981',
                    marginBottom: '0.5rem',
                  }}
                >
                  Awesome! Clue Submitted.
                </h2>
                <p style={{ color: T.textMuted, marginBottom: '2rem' }}>
                  Ollie is taking your clue to the reviewers. You'll be redirected shortly...
                </p>
                <div className="flex justify-center">
                  <CheckCircle2 size={48} style={{ color: '#10B981' }} />
                </div>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div
                    className="p-4 rounded-2xl flex items-center gap-3 border"
                    style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#B91C1C' }}
                  >
                    <AlertCircle size={20} />
                    <span className="text-sm font-bold">{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-black uppercase tracking-wider"
                      style={{ color: T.textMuted }}
                    >
                      Clue Text
                    </label>
                    <textarea
                      required
                      name="clue_text"
                      value={formData.clue_text}
                      onChange={handleChange}
                      placeholder="e.g. Stone broken becomes musical sounds (5)"
                      className="w-full p-4 rounded-2xl border-2 focus:outline-none focus:border-[#7C3AED] transition-colors min-h-[100px]"
                      style={inputStyle}
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label
                        className="text-sm font-black uppercase tracking-wider"
                        style={{ color: T.textMuted }}
                      >
                        Answer
                      </label>
                      <input
                        required
                        name="answer"
                        value={formData.answer}
                        onChange={handleChange}
                        placeholder="e.g. TONES"
                        className="w-full p-4 rounded-2xl border-2 focus:outline-none focus:border-[#7C3AED] transition-colors"
                        style={inputStyle}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        className="text-sm font-black uppercase tracking-wider"
                        style={{ color: T.textMuted }}
                      >
                        Pattern
                      </label>
                      <input
                        required
                        name="answer_pattern"
                        value={formData.answer_pattern}
                        onChange={handleChange}
                        placeholder="e.g. 5 or 3,4"
                        className="w-full p-4 rounded-2xl border-2 focus:outline-none focus:border-[#7C3AED] transition-colors"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-black uppercase tracking-wider"
                      style={{ color: T.textMuted }}
                    >
                      Primary Wordplay Type
                    </label>
                    <select
                      name="primary_type"
                      value={formData.primary_type}
                      onChange={handleChange}
                      className="w-full p-4 rounded-2xl border-2 focus:outline-none focus:border-[#7C3AED] transition-colors appearance-none"
                      style={inputStyle}
                    >
                      {WORDPLAY_TYPES.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-black uppercase tracking-wider"
                      style={{ color: T.textMuted }}
                    >
                      Definition Text
                    </label>
                    <input
                      required
                      name="definition_text"
                      value={formData.definition_text}
                      onChange={handleChange}
                      placeholder="The part of the clue that defines the answer"
                      className="w-full p-4 rounded-2xl border-2 focus:outline-none focus:border-[#7C3AED] transition-colors"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-black uppercase tracking-wider"
                    style={{ color: T.textMuted }}
                  >
                    Wordplay Summary
                  </label>
                  <input
                    required
                    name="wordplay_summary"
                    value={formData.wordplay_summary}
                    onChange={handleChange}
                    placeholder="e.g. Anagram of STONE"
                    className="w-full p-4 rounded-2xl border-2 focus:outline-none focus:border-[#7C3AED] transition-colors"
                    style={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-black uppercase tracking-wider"
                      style={{ color: T.textMuted }}
                    >
                      Fodder (Optional)
                    </label>
                    <input
                      name="fodder"
                      value={formData.fodder}
                      onChange={handleChange}
                      placeholder="The letters to be manipulated"
                      className="w-full p-4 rounded-2xl border-2 focus:outline-none focus:border-[#7C3AED] transition-colors"
                      style={inputStyle}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-black uppercase tracking-wider"
                      style={{ color: T.textMuted }}
                    >
                      Indicator (Optional)
                    </label>
                    <input
                      name="indicator"
                      value={formData.indicator}
                      onChange={handleChange}
                      placeholder="e.g. broken, back, in"
                      className="w-full p-4 rounded-2xl border-2 focus:outline-none focus:border-[#7C3AED] transition-colors"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-black uppercase tracking-wider"
                    style={{ color: T.textMuted }}
                  >
                    Detailed Explanation
                  </label>
                  <textarea
                    required
                    name="explanation"
                    value={formData.explanation}
                    onChange={handleChange}
                    placeholder="Explain how the clue works step-by-step..."
                    className="w-full p-4 rounded-2xl border-2 focus:outline-none focus:border-[#7C3AED] transition-colors min-h-[120px]"
                    style={inputStyle}
                  />
                </div>

                <div
                  className="p-4 rounded-2xl flex items-start gap-3"
                  style={{
                    background: isDark ? '#1A1035' : '#F5F3FF',
                    border: `1px dashed ${isDark ? '#4C3580' : '#C4B5FD'}`,
                  }}
                >
                  <Info size={18} style={{ color: '#7C3AED', marginTop: 2 }} />
                  <p style={{ fontSize: '0.8rem', color: T.textMuted, margin: 0 }}>
                    By submitting, you agree that your clue may be edited for fairness and style
                    before publication. Accepted clues will appear in the daily rotation with your
                    name/email as the author.
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={submitting}
                  type="submit"
                  className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                    boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
                  }}
                >
                  {submitting ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function RefreshCw({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
