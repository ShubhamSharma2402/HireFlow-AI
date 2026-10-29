import React, { useState, useEffect } from 'react';
import { Copy, Check, FileText } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setText(formatCoverLetterText(content));
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleToneChange = (newTone) => {
    setTone(newTone);
    const baseText = formatCoverLetterText(content);
    setText(`[Tone: ${newTone}]\n\n${baseText}`);
  };

  return (
    <div className="cover-letter-section">
      <div className="cover-letter-toolbar">
        <div className="tone-selector">
          {['Professional', 'Confident', 'Enthusiastic'].map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${tone === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleToneChange(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="actions">
          <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
            {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      <div className="cover-letter-document">
        {text}
      </div>
    </div>
  );
};

export default CoverLetter;
