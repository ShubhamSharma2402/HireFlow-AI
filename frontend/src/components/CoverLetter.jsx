import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, FileText } from 'lucide-react';
import './CoverLetter.css';

/**
 * Formats a raw object or string cover letter into clean text
 */
const formatCoverLetterText = (content) => {
  if (!content) return 'Dear Hiring Manager,\n\nI am writing to express my strong interest in this position...';
  if (typeof content === 'string') return content;

  let text = '';
  if (content.subject) text += `SUBJECT: ${content.subject}\n\n`;
  if (content.greeting) text += `${content.greeting}\n\n`;
  if (content.openingParagraph) text += `${content.openingParagraph}\n\n`;
  if (content.bodyParagraph1) text += `${content.bodyParagraph1}\n\n`;
  if (content.bodyParagraph2) text += `${content.bodyParagraph2}\n\n`;
  if (content.closingParagraph) text += `${content.closingParagraph}\n\n`;
  if (content.signature) text += `${content.signature}`;

  return text || JSON.stringify(content, null, 2);
};

const CoverLetter = ({ content }) => {
  const [text, setText] = useState('');
  const [tone, setTone] = useState('Professional');

  useEffect(() => {
    setText(formatCoverLetterText(content));
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    alert('Cover letter copied to clipboard!');
  };

  const handleToneChange = (newTone) => {
    setTone(newTone);
    // Add prefix to signal tone adjustment
    const baseText = formatCoverLetterText(content);
    setText(`[Tone: ${newTone}]\n\n${baseText}`);
  };

  return (
    <div className="cover-letter-section">
      <div className="toolbar glass-card mb-4 flex justify-between items-center p-4">
        <div className="tone-selector flex gap-2">
          {['Professional', 'Confident', 'Enthusiastic'].map((t) => (
            <button
              key={t}
              className={`btn ${tone === t ? 'btn-primary' : 'btn-secondary'} text-sm`}
              onClick={() => handleToneChange(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="actions flex gap-3">
          <button className="btn btn-primary text-sm" onClick={handleCopy}>
            <Copy size={14} /> Copy to Clipboard
          </button>
        </div>
      </div>

      <div className="letter-container glass-card p-8">
        <textarea
          className="letter-textarea input-field"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
        />
        <div className="letter-stats text-muted text-sm mt-4 text-right">
          {text.split(/\s+/).filter(Boolean).length} words | {text.length} characters
        </div>
      </div>
    </div>
  );
};

export default CoverLetter;
