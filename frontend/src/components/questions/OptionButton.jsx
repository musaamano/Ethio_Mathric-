import React from 'react';

// state: 'idle' | 'selected' | 'correct' | 'wrong' | 'reveal'
export default function OptionButton({ label, text, state = 'idle', onClick, disabled }) {
  const styles = {
    idle:     'bg-white border-2 border-mint-dark/30 text-gray-700 hover:border-primary-400 hover:bg-primary-50 cursor-pointer',
    selected: 'bg-primary-50 border-2 border-primary-500 text-primary-700 shadow-glow-green',
    correct:  'bg-mint-light border-2 border-sage-400 text-sage-700 shadow-soft',
    wrong:    'bg-red-50 border-2 border-red-400 text-red-700',
    reveal:   'bg-mint-light border-2 border-sage-300 text-sage-700 opacity-80',
  };

  const icons = {
    correct: <svg className="w-4 h-4 text-sage-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>,
    wrong:   <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === 'correct' || state === 'wrong' || state === 'reveal'}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all duration-200 ${styles[state] || styles.idle} disabled:cursor-default`}
    >
      {/* Label bubble */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all ${
        state === 'idle' || state === 'selected' ? 'bg-primary-100 text-primary-600' :
        state === 'correct' || state === 'reveal' ? 'bg-sage-400 text-white' :
        'bg-red-400 text-white'
      }`}>
        {label}
      </div>
      <span className="flex-1 text-sm leading-snug">{text}</span>
      {icons[state]}
    </button>
  );
}
