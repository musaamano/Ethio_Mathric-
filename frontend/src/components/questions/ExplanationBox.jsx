import React, { useEffect, useRef, useState } from 'react';
import Badge from '../common/Badge';

export default function ExplanationBox({ explanation, question, isCorrect, correctOption, onReadComplete }) {
  const scrollRef = useRef(null);
  const [hasTriggeredRead, setHasTriggeredRead] = useState(false);

  // Auto trigger or scroll trigger logic
  useEffect(() => {
    if (!explanation || hasTriggeredRead) return;

    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      // If user scrolled to the bottom (allow 15px margin of error)
      if (el.scrollHeight - el.scrollTop <= el.clientHeight + 15) {
        setHasTriggeredRead(true);
        onReadComplete();
        el.removeEventListener('scroll', checkScroll);
      }
    };

    // Initial check: if content is short and doesn't need scrolling
    if (el.scrollHeight <= el.clientHeight + 15) {
      const timer = setTimeout(() => {
        setHasTriggeredRead(true);
        onReadComplete();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // Needs scrolling
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [explanation, hasTriggeredRead, onReadComplete]);

  if (!explanation) return null;

  return (
    <div className={`border-2 rounded-3xl overflow-hidden shadow-soft transition-all duration-500 animate-fade-up ${
      isCorrect ? 'border-sage-400 bg-mint-light/30' : 'border-red-400 bg-red-50/50'
    }`}>
      {/* Result Header */}
      <div className={`p-5 flex items-center justify-between border-b ${
        isCorrect ? 'bg-mint-light border-sage-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm ${
            isCorrect ? 'bg-sage-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {isCorrect ? '✓' : '✗'}
          </div>
          <div>
            <h3 className={`font-display font-extrabold text-xl ${isCorrect ? 'text-sage-700' : 'text-red-700'}`}>
              {isCorrect ? 'Correct!' : 'Incorrect!'}
            </h3>
            <p className={`text-sm font-semibold ${isCorrect ? 'text-sage-600' : 'text-red-600'}`}>
              Correct Answer: {correctOption}
            </p>
          </div>
        </div>
        
        {/* Meta tags */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
          {question?.difficulty && <Badge preset="difficulty" value={question.difficulty} />}
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        ref={scrollRef}
        className="max-h-80 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white/60"
      >
        {/* Why Correct */}
        {explanation.why_correct && (
          <div className="space-y-2">
            <h4 className="font-bold text-sage-700 flex items-center gap-2">
              <span className="text-xl">💡</span> Why it's correct
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
              {explanation.why_correct}
            </p>
          </div>
        )}

        {/* Wrong Options */}
        {['a','b','c','d'].some(l => explanation[`why_${l}_wrong`]) && (
          <div className="space-y-3">
            <h4 className="font-bold text-red-600 flex items-center gap-2">
              <span className="text-xl">❌</span> Why other options are wrong
            </h4>
            <div className="space-y-2">
              {['a','b','c','d'].map(l => explanation[`why_${l}_wrong`] && (
                <div key={l} className="flex gap-3 p-3 bg-white rounded-2xl shadow-sm border border-red-50">
                  <div className="w-7 h-7 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {l.toUpperCase()}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{explanation[`why_${l}_wrong`]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory Trick */}
        {explanation.memory_trick && (
          <div className="space-y-2">
            <h4 className="font-bold text-primary-600 flex items-center gap-2">
              <span className="text-xl">🧠</span> Memory Trick
            </h4>
            <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 text-primary-800 text-sm leading-relaxed">
              <p className="whitespace-pre-line">{explanation.memory_trick}</p>
            </div>
          </div>
        )}

        {/* Common Mistake */}
        {explanation.common_mistake && (
          <div className="space-y-2">
            <h4 className="font-bold text-orange-600 flex items-center gap-2">
              <span className="text-xl">⚠️</span> Common Mistake
            </h4>
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-orange-800 text-sm leading-relaxed">
              <p className="whitespace-pre-line">{explanation.common_mistake}</p>
            </div>
          </div>
        )}

        {explanation.reference && (
          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            📖 Reference: {explanation.reference}
          </p>
        )}
      </div>
      
      {/* Bottom indicator for scrolling */}
      {!hasTriggeredRead && (
        <div className="bg-gray-800 text-white text-xs text-center py-2 font-medium animate-pulse">
          ↓ Scroll down to read the full explanation before continuing ↓
        </div>
      )}
    </div>
  );
}
