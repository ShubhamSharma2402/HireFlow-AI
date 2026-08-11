import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, MessageSquare, Sparkles } from 'lucide-react';
import { normalizeQAList } from '../utils/qaFormat';
import './QASection.css';

const defaultFallbackQA = [
  {
    question: 'Why this role?',
    answer: 'My technical background and hands-on experience in building scalable systems align directly with the key requirements of this role. I am excited to apply my skills to deliver immediate impact.',
    tips: 'Focus on aligning your key achievements with the core technical requirements.',
  },
  {
    question: 'Why this company?',
    answer: "I strongly resonate with the company's product vision and commitment to engineering excellence. Working on complex technical challenges alongside a high-performing team is my ideal environment.",
    tips: 'Mention specific company values or product innovations.',
  },
  {
    question: 'Tell me about a relevant project',
    answer: 'In a recent major project, I architected end-to-end features, optimized database queries for performance, and implemented automated error tracking to ensure high availability.',
    tips: 'Use the STAR method (Situation, Task, Action, Result).',
  },
];

const QASection = ({ qaList }) => {
  const [practiceMode, setPracticeMode] = useState(false);
  const [openIndex, setOpenIndex] = useState(0);

  const normalized = normalizeQAList(qaList);
  const list = normalized.length > 0 ? normalized : defaultFallbackQA;

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  const expandAll = () => setOpenIndex(-2);

  const copyAnswer = (answer, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(answer);
    alert('Answer copied to clipboard!');
  };

  const isOpen = (index) => openIndex === -2 || openIndex === index;

  return (
    <div className="qa-section">
      <div className="qa-header glass-card p-4 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-purple-light" size={24} />
          <div>
            <h3 className="text-base font-bold">Role-Specific Interview Q&A Prep</h3>
            <p className="text-xs text-muted">
              {list.length} tailored question{list.length !== 1 ? 's' : ''} with suggested answers based on your resume and the job description.
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-secondary text-xs" onClick={expandAll}>
            Expand All
          </button>
          <button className="btn btn-secondary text-xs" onClick={() => setPracticeMode(!practiceMode)}>
            {practiceMode ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{practiceMode ? 'Exit Practice Mode' : 'Practice Mode'}</span>
          </button>
        </div>
      </div>

      <div className="qa-list flex flex-col gap-4">
        {list.map((qa, i) => {
          const expanded = isOpen(i);
          const questionText = qa.question;
          const answerText = qa.answer;
          const tipsText = qa.tips;

          return (
            <div key={i} className={`qa-card glass-card ${expanded ? 'open' : ''}`}>
              <div
                className="qa-question p-4 cursor-pointer flex justify-between items-center"
                onClick={() => toggleAccordion(i)}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan flex-shrink-0" />
                  <h4 className="font-bold text-sm qa-question-text">{questionText}</h4>
                </div>
                {expanded ? <ChevronUp size={18} className="text-purple-light" /> : <ChevronDown size={18} className="text-muted" />}
              </div>

              {expanded && (
                <div className="qa-answer p-4 border-t border-glass">
                  {!practiceMode ? (
                    <>
                      <p className="mb-4 text-sm leading-relaxed qa-answer-text">{answerText}</p>
                      {tipsText && (
                        <div className="tips-badge p-3 rounded mb-4 bg-card border border-glass">
                          <strong className="text-cyan text-xs uppercase tracking-wider block mb-1">Pro Tip:</strong>
                          <span className="text-xs text-muted">{tipsText}</span>
                        </div>
                      )}
                      <button className="btn btn-secondary text-xs" onClick={(e) => copyAnswer(answerText, e)}>
                        <Copy size={12} /> Copy Answer
                      </button>
                    </>
                  ) : (
                    <div className="practice-area">
                      <p className="text-xs text-muted italic mb-3">
                        Practice answering out loud, then exit practice mode to compare with the AI suggested answer.
                      </p>
                      <textarea
                        className="input-field text-sm"
                        placeholder="Type your practice notes or bullet points here..."
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QASection;
