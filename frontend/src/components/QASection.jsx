import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Eye, EyeOff, MessageSquare } from 'lucide-react';
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
  const [copiedIndex, setCopiedIndex] = useState(null);

  const normalized = normalizeQAList(qaList);
  const list = normalized.length > 0 ? normalized : defaultFallbackQA;

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  const expandAll = () => setOpenIndex(-2);

  const copyAnswer = (answer, index, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(answer);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2200);
  };

  const isOpen = (index) => openIndex === -2 || openIndex === index;

  return (
    <div className="qa-section">
      <div className="qa-header">
        <div className="flex items-center gap-3">
          <MessageSquare className="text-accent" size={22} />
          <div>
            <h3 className="text-base font-bold">Role-Specific Interview Q&A Prep</h3>
            <p className="text-xs text-muted">
              {list.length} tailored question{list.length !== 1 ? 's' : ''} with suggested answers based on your resume and target job requirements.
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-secondary btn-sm" onClick={expandAll}>
            Expand All
          </button>
          <button
            className={`btn btn-sm ${practiceMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPracticeMode(!practiceMode)}
          >
            {practiceMode ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>Practice Mode</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {list.map((item, index) => {
          const isItemOpen = isOpen(index);
          const hasCopied = copiedIndex === index;

          return (
            <div key={index} className="qa-item-card">
              <div
                className="qa-question-bar"
                onClick={() => toggleAccordion(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleAccordion(index); }}
              >
                <span className="qa-question-text">
                  <span className="text-muted" style={{ marginRight: '8px' }}>Q{index + 1}.</span>
                  {item.question}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={(e) => copyAnswer(item.answer, index, e)}
                    title="Copy Answer"
                  >
                    {hasCopied ? <Check size={12} className="text-green" /> : <Copy size={12} />}
                    <span>{hasCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                  {isItemOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {isItemOpen && (
                <div className="qa-answer-body">
                  {practiceMode ? (
                    <p className="text-muted text-sm italic" style={{ padding: '1rem 0' }}>
                      Practice Mode Active: Formulate your answer out loud before reviewing the recommended answer.
                    </p>
                  ) : (
                    <>
                      <p className="qa-answer-text">{item.answer}</p>
                      {item.tips && (
                        <div className="qa-tips-box">
                          <strong>Strategic Tip:</strong> {item.tips}
                        </div>
                      )}
                    </>
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
