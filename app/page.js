'use client';

import { useState, useRef, useEffect } from 'react';

export default function StudyApp() {
  const [inputText, setInputText] = useState('');
  const [refinementText, setRefinementText] = useState('');
  const [loading, setLoading] = useState(false);
  const [refineLoading, setRefineLoading] = useState(false);
  const [error, setError] = useState(null);
  const [studyData, setStudyData] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);

  // UI Modes & Controls
  const [activeTab, setActiveTab] = useState('flashcards'); // 'flashcards' | 'quiz' | 'mindmap'
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showDeepExplain, setShowDeepExplain] = useState(false);

  // Spaced Repetition Ratings State
  const [cardRatings, setCardRatings] = useState({}); // { cardId: 'hard'|'medium'|'easy' }
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'hard'

  // Timed Quiz States
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 minute default
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const latestRequestId = useRef(0);
  const mermaidRef = useRef(null);

  // PDF Text Extraction Handler
const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      try {
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to extract text from PDF.');
        }

        setInputText(data.text);
      } catch (err) {
        console.error('PDF Upload Error:', err);
        setError(err.message || 'Failed to extract text from PDF. Please paste text manually.');
      } finally {
        setLoading(false);
      }
    } else {
      // Plain text file (.txt)
      const reader = new FileReader();
      reader.onload = (event) => setInputText(event.target.result);
      reader.readAsText(file);
    }
  };

  // Saved sessions & Mermaid rendering
  useEffect(() => {
    const localData = localStorage.getItem('ai_study_sessions');
    if (localData) {
      try { setSavedSessions(JSON.parse(localData)); } catch (e) {}
    }
  }, []);

  // Render Mindmap diagram using Mermaid
// Mindmap diagram rendering using Mermaid
  useEffect(() => {
    let isMounted = true;

    if (activeTab === 'mindmap' && studyData?.mindmap) {
      import('mermaid').then((mermaid) => {
        if (!isMounted) return;
        
        mermaid.default.initialize({ 
          startOnLoad: false, 
          theme: 'neutral',
          securityLevel: 'loose' 
        });

        if (mermaidRef.current) {
          mermaidRef.current.removeAttribute('data-processed');
          // Escape newline sequences properly
          const cleanDiagram = studyData.mindmap.replace(/\\n/g, '\n');
          
          mermaid.default.render('mermaid-svg', cleanDiagram).then(({ svg }) => {
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = svg;
            }
          }).catch((err) => {
            console.error('Mermaid Render Error:', err);
            if (mermaidRef.current) {
              mermaidRef.current.innerHTML = '<p className="text-red-500 text-xs">Failed to render mindmap syntax.</p>';
            }
          });
        }
      });
    }

    return () => { isMounted = false; };
  }, [activeTab, studyData]);

  // Quiz Countdown Timer effect
  useEffect(() => {
    let timer;
    if (isTimerRunning && timerSeconds > 0 && !quizSubmitted) {
      timer = setInterval(() => setTimerSeconds((prev) => prev - 1), 1000);
    } else if (timerSeconds === 0 && !quizSubmitted) {
      setQuizSubmitted(true);
      setIsTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timerSeconds, quizSubmitted]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeTab !== 'flashcards' || !studyData) return;
      const activeElement = document.activeElement;
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, studyData, cardIndex, filterMode]);

  const displayedCards = studyData ? (
    filterMode === 'hard'
      ? studyData.cards.filter((c) => cardRatings[c.id] === 'hard')
      : studyData.cards
  ) : [];

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleExportPDF = () => {
    if (!studyData) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${studyData.topic} - Study Sheet</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; line-height: 1.6; }
            h1 { border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
            .card { border: 1px solid #cbd5e1; margin-bottom: 20px; padding: 16px; border-radius: 8px; background: #f8fafc; }
            .q { font-weight: bold; font-size: 16px; margin-bottom: 8px; }
            .a { color: #1e40af; font-weight: 600; margin-bottom: 8px; }
            .exp { background: #ffffff; padding: 12px; border-left: 4px solid #3b82f6; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>📚 Study Kit: ${studyData.topic}</h1>
          ${studyData.cards.map((c, i) => `
            <div class="card">
              <div class="q">Q${i + 1}: ${c.question}</div>
              <div class="a">Answer: ${c.answer}</div>
              ${c.explanation ? `<div class="exp"><strong>Explanation:</strong> ${c.explanation}</div>` : ''}
            </div>
          `).join('')}
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const saveToHistory = (newPayload) => {
    const updated = [newPayload, ...savedSessions.filter(s => s.topic !== newPayload.topic)].slice(0, 5);
    setSavedSessions(updated);
    localStorage.setItem('ai_study_sessions', JSON.stringify(updated));
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    const currentRequestId = ++latestRequestId.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      if (currentRequestId !== latestRequestId.current) return;
      if (!res.ok) throw new Error(data.error || 'Failed to generate materials.');

      setStudyData(data);
      saveToHistory(data);
      setCardIndex(0);
      setIsFlipped(false);
      setShowDeepExplain(false);
      setUserAnswers({});
      setQuizSubmitted(false);
      setCardRatings({});
      setFilterMode('all');
    } catch (err) {
      if (currentRequestId === latestRequestId.current) setError(err.message);
    } finally {
      if (currentRequestId === latestRequestId.current) setLoading(false);
    }
  };

  const handleNext = () => {
    if (displayedCards.length && cardIndex < displayedCards.length - 1) {
      setCardIndex(cardIndex + 1);
      setIsFlipped(false);
      setShowDeepExplain(false);
    }
  };

  const handlePrev = () => {
    if (cardIndex > 0) {
      setCardIndex(cardIndex - 1);
      setIsFlipped(false);
      setShowDeepExplain(false);
    }
  };

  const setRating = (rating) => {
    const currentCard = displayedCards[cardIndex];
    if (!currentCard) return;
    setCardRatings({ ...cardRatings, [currentCard.id]: rating });
    handleNext();
  };

  const startTimedQuiz = () => {
    setUserAnswers({});
    setQuizSubmitted(false);
    setTimerSeconds(300);
    setIsTimerRunning(true);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider">
          AI Learning Studio Pro
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">⚡ Complete AI Study Suite</h1>
        <p className="text-slate-600 max-w-lg mx-auto">
          Upload PDF notes, generate Flashcards, Mind Maps, Timed Mock Quizzes, and track Spaced Repetition.
        </p>
      </header>

      {/* Input & File Upload Section */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <label className="text-sm font-bold text-slate-700">Paste Notes or Upload File:</label>
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileUpload}
            className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste your study notes or upload a PDF document..."
          className="w-full h-36 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-base resize-none"
        />

        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading || !inputText.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-50 transition shadow-md cursor-pointer"
          >
            {loading ? 'Analyzing Content & Building Kit...' : 'Generate Full Study Suite'}
          </button>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={handleGenerate} className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-bold">Retry</button>
        </div>
      )}

      {/* Active Deck & Interactive Suite */}
      {studyData && !loading && (
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Active Suite</span>
              <h2 className="text-2xl font-bold text-slate-800">{studyData.topic}</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleExportPDF} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition">
                📄 Export PDF
              </button>

              <div className="inline-flex p-1 bg-slate-100 rounded-xl space-x-1">
                <button
                  onClick={() => setActiveTab('flashcards')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${activeTab === 'flashcards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                >
                  🎴 Flashcards
                </button>
                <button
                  onClick={() => setActiveTab('mindmap')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${activeTab === 'mindmap' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                >
                  🧠 Mind Map
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${activeTab === 'quiz' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                >
                  ⏱️ Timed Quiz
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: FLASHCARDS + SPACED REPETITION */}
          {activeTab === 'flashcards' && (
            <div className="space-y-6">
              {/* Spaced Repetition Filter Toolbar */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setFilterMode('all'); setCardIndex(0); }}
                    className={`px-3 py-1 rounded-full font-bold ${filterMode === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    All Cards ({studyData.cards.length})
                  </button>
                  <button
                    onClick={() => { setFilterMode('hard'); setCardIndex(0); }}
                    className={`px-3 py-1 rounded-full font-bold ${filterMode === 'hard' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'}`}
                  >
                    🔴 Hard Only ({Object.values(cardRatings).filter(r => r === 'hard').length})
                  </button>
                </div>
              </div>

              {displayedCards.length > 0 ? (
                <>
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="relative min-h-[260px] p-8 border-2 border-blue-200 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer bg-gradient-to-br from-blue-50/50 to-indigo-50/50 transition duration-300 shadow-sm select-none"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const c = displayedCards[cardIndex];
                        handleSpeak(isFlipped ? `${c?.answer}. ${c?.explanation}` : c?.question);
                      }}
                      className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full text-xs font-semibold text-slate-700"
                    >
                      🔊 Listen
                    </button>

                    <span className="text-xs uppercase font-bold tracking-widest text-blue-500 mb-4">
                      {isFlipped ? '💡 Answer' : '❓ Question'}
                    </span>
                    
                    <p className="text-lg md:text-xl font-semibold text-slate-800 leading-relaxed max-w-2xl">
                      {isFlipped ? displayedCards[cardIndex]?.answer : displayedCards[cardIndex]?.question}
                    </p>

                    {isFlipped && displayedCards[cardIndex]?.explanation && (
                      <div className="mt-6 w-full text-left bg-white/90 p-4 rounded-xl border border-blue-100 shadow-inner">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowDeepExplain(!showDeepExplain); }}
                          className="text-xs font-bold text-blue-600 flex items-center gap-1"
                        >
                          {showDeepExplain ? '🔽 Hide Breakdown' : '🔍 Read Deep Explanation'}
                        </button>
                        {showDeepExplain && (
                          <p className="mt-3 text-sm text-slate-700 leading-normal border-t pt-2">
                            {displayedCards[cardIndex]?.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rating Controls (Spaced Repetition) */}
                  {isFlipped && (
                    <div className="flex justify-center items-center gap-3 pt-2">
                      <span className="text-xs text-slate-400 font-bold uppercase">Rate Difficulty:</span>
                      <button onClick={() => setRating('hard')} className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl transition">
                        🔴 Hard
                      </button>
                      <button onClick={() => setRating('medium')} className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-xl transition">
                        🟡 Medium
                      </button>
                      <button onClick={() => setRating('easy')} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition">
                        🟢 Easy
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-600">
                    <button disabled={cardIndex === 0} onClick={handlePrev} className="px-4 py-2 border rounded-xl font-medium hover:bg-slate-50 disabled:opacity-30">
                      ← Previous
                    </button>
                    <span className="text-sm font-semibold">
                      Card {cardIndex + 1} of {displayedCards.length}
                    </span>
                    <button disabled={cardIndex === displayedCards.length - 1} onClick={handleNext} className="px-4 py-2 border rounded-xl font-medium hover:bg-slate-50 disabled:opacity-30">
                      Next →
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border">
                  No cards marked as "Hard" yet!
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MIND MAP / FLOWCHART */}
          {activeTab === 'mindmap' && (
            <div className="p-6 bg-slate-50 border rounded-2xl flex flex-col items-center justify-center min-h-[300px] overflow-x-auto">
              <span className="text-xs font-bold uppercase text-slate-400 mb-4">Interactive Concept Mind Map</span>
              <div ref={mermaidRef} className="mermaid w-full flex justify-center">
                {studyData.mindmap || 'graph TD\n  A[Study Material] --> B[Key Concepts]'}
              </div>
            </div>
          )}

          {/* TAB 3: TIMED MOCK QUIZ */}
          {activeTab === 'quiz' && (
            <div className="space-y-6">
              {/* Timer Header */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Timed Exam Mode</span>
                  <p className="text-lg font-bold">
                    ⏱️ Time Remaining: {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                {!isTimerRunning && !quizSubmitted && (
                  <button onClick={startTimedQuiz} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition">
                    Start 5-Min Quiz
                  </button>
                )}
              </div>

              {studyData.cards.map((card, idx) => (
                <div key={card.id} className="p-5 border border-slate-100 rounded-xl bg-slate-50/50 space-y-4">
                  <p className="font-semibold text-slate-800 text-lg">{idx + 1}. {card.question}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {card.options.map((opt, optIdx) => {
                      const isSelected = userAnswers[card.id] === optIdx;
                      const isCorrect = card.correctIndex === optIdx;
                      let btnStyle = 'border-slate-200 bg-white text-slate-700';

                      if (quizSubmitted) {
                        if (isCorrect) btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-medium';
                        else if (isSelected) btnStyle = 'bg-rose-50 border-rose-500 text-rose-900';
                      } else if (isSelected) {
                        btnStyle = 'border-blue-500 bg-blue-50 text-blue-900 font-medium';
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={quizSubmitted || !isTimerRunning}
                          onClick={() => setUserAnswers({ ...userAnswers, [card.id]: optIdx })}
                          className={`p-3.5 text-left border rounded-xl text-sm transition ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {quizSubmitted && card.explanation && (
                    <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl text-sm text-slate-700">
                      <strong className="text-blue-900 block mb-1">📖 Deep Explanation:</strong>
                      {card.explanation}
                    </div>
                  )}
                </div>
              ))}

              {!quizSubmitted ? (
                <button
                  onClick={() => { setQuizSubmitted(true); setIsTimerRunning(false); }}
                  disabled={!isTimerRunning}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition"
                >
                  Submit Timed Exam
                </button>
              ) : (
                <div className="p-5 bg-slate-900 text-white rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Final Score</span>
                    <p className="text-2xl font-bold">
                      {studyData.cards.filter(c => userAnswers[c.id] === c.correctIndex).length} / {studyData.cards.length}
                    </p>
                  </div>
                  <button onClick={startTimedQuiz} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition">
                    🔄 Restart Mock Quiz
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}