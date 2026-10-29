/**
 * Formats resume data into plain text and handles professional ATS PDF rendering.
 * Supports structured completeResume objects and plain-text fallback.
 */

// Prompt leakage detection regex for client-side rendering
const LEAKAGE_REGEX = /\b(boundary\s+iterative\s+control|iterative\s+control|system\s+prompt|as\s+an\s+ai|agent\s+instructions?|developer\s+notes?|rewritten\s+(line|bullet)|optimization\s+plan)\b[:\s-]*/gi;

export const cleanResumeString = (str) => {
  if (str === null || str === undefined) return '';
  if (Array.isArray(str)) {
    return str.map(cleanResumeString).filter(Boolean).join('\n');
  }
  if (typeof str === 'object') {
    const val = str.description || str.bullet || str.text || str.name || str.skill || str.summary || str.improved || str.original || str.achievement || str.certification || JSON.stringify(str);
    return cleanResumeString(val);
  }
  if (typeof str !== 'string') str = String(str);
  return str
    .replace(LEAKAGE_REGEX, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=')
    .replace(/\u00A0/g, ' ')
    .trim();
};

/**
 * Formats resume data into clean text for ATS parsing and scoring.
 */
export const formatResumeToText = (resume) => {
  if (!resume) return '';
  if (typeof resume === 'string') return cleanResumeString(resume);

  // Check if structured sections exist
  const hasStructured = Boolean(
    (resume.skillCategories && resume.skillCategories.length > 0) ||
    (resume.projects && resume.projects.length > 0) ||
    (resume.experience && resume.experience.length > 0) ||
    (resume.education && resume.education.length > 0)
  );

  // If NO structured data exists, fall back to rawText
  if (!hasStructured && resume.rawText && typeof resume.rawText === 'string') {
    return cleanResumeString(resume.rawText.trim());
  }

  const lines = [];

  if (resume.name) lines.push(cleanResumeString(resume.name));
  const contact = [resume.email, resume.phone, resume.linkedin, resume.github, resume.website]
    .filter(Boolean).map(cleanResumeString).join(' | ');
  if (contact) lines.push(contact);
  lines.push('');

  if (resume.summary) {
    lines.push('PROFESSIONAL SUMMARY');
    lines.push(cleanResumeString(resume.summary));
    lines.push('');
  }

  // Structured skills format
  if (resume.skillCategories && Array.isArray(resume.skillCategories) && resume.skillCategories.length > 0) {
    lines.push('TECHNICAL SKILLS');
    resume.skillCategories.forEach(cat => {
      const skills = (cat.skills || []).map(cleanResumeString).filter(Boolean);
      if (skills.length > 0) {
        lines.push(`${cleanResumeString(cat.category)}: ${skills.join(', ')}`);
      }
    });
    lines.push('');
  } else if (resume.skills && resume.skills.length > 0) {
    lines.push('SKILLS');
    const skills = Array.isArray(resume.skills) ? resume.skills.map(cleanResumeString).join(', ') : cleanResumeString(resume.skills);
    lines.push(skills);
    lines.push('');
  }

  if (resume.experience && resume.experience.length > 0) {
    lines.push('EXPERIENCE');
    resume.experience.forEach((exp) => {
      if (typeof exp === 'string') {
        lines.push(cleanResumeString(exp));
      } else {
        const title = cleanResumeString(exp.title || 'Role');
        const company = cleanResumeString(exp.company || '');
        const duration = cleanResumeString(exp.duration || '');
        lines.push(`${title} | ${company} | ${duration}`);
        if (exp.bullets) {
          exp.bullets.forEach((b) => {
            const cleanB = cleanResumeString(b);
            if (cleanB) lines.push(`• ${cleanB}`);
          });
        }
        lines.push('');
      }
    });
  }

  if (resume.projects && resume.projects.length > 0) {
    lines.push('PROJECTS');
    resume.projects.forEach((proj) => {
      if (typeof proj === 'string') {
        lines.push(cleanResumeString(proj));
      } else {
        const name = cleanResumeString(proj.name || 'Project');
        const techStr = proj.technologies ? ` | ${cleanResumeString(proj.technologies)}` : '';
        lines.push(`${name}${techStr}`);
        if (proj.bullets) {
          proj.bullets.forEach((b) => {
            const cleanB = cleanResumeString(b);
            if (cleanB) lines.push(`• ${cleanB}`);
          });
        }
        lines.push('');
      }
    });
  }

  if (resume.education && resume.education.length > 0) {
    lines.push('EDUCATION');
    if (Array.isArray(resume.education)) {
      resume.education.forEach((edu) => {
        if (typeof edu === 'string') {
          lines.push(cleanResumeString(edu));
        } else {
          const gpaStr = edu.gpa ? ` | GPA: ${cleanResumeString(edu.gpa)}` : '';
          const deg = cleanResumeString(edu.degree || '');
          const inst = cleanResumeString(edu.institution || '');
          const yr = cleanResumeString(edu.year || '');
          lines.push(`${deg} | ${inst} | ${yr}${gpaStr}`);
        }
      });
    }
    lines.push('');
  }

  if (resume.certifications && resume.certifications.length > 0) {
    lines.push('CERTIFICATIONS');
    resume.certifications.forEach((c) => {
      const cleanC = cleanResumeString(c);
      if (cleanC) lines.push(`• ${cleanC}`);
    });
    lines.push('');
  }

  if (resume.achievements && resume.achievements.length > 0) {
    lines.push('ACHIEVEMENTS');
    resume.achievements.forEach((a) => {
      const cleanA = cleanResumeString(a);
      if (cleanA) lines.push(`• ${cleanA}`);
    });
    lines.push('');
  }

  return lines.join('\n').trim();
};

/**
 * Renders a professional, single-column ATS PDF using jsPDF (CDN import).
 * Guaranteed selectable text, clean visual hierarchy, and pagination safety.
 */
export const downloadResumeAsPdf = async (resumeInput, filename = 'Optimized_Resume.pdf') => {
  const resumeText = typeof resumeInput === 'string'
    ? cleanResumeString(resumeInput)
    : formatResumeToText(resumeInput);

  if (!resumeText || !resumeText.trim()) {
    throw new Error('No resume content to download.');
  }

  // Load jsPDF from CDN
  const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm');

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 20;
  const maxWidth = pageWidth - marginLeft - marginRight;

  let y = marginTop;

  const lines_raw = resumeText.split('\n');

  const SECTION_HEADERS = [
    'PROFESSIONAL SUMMARY', 'SUMMARY', 'TECHNICAL SKILLS', 'SKILLS',
    'PROJECT EXPERIENCE', 'PROJECTS', 'EXPERIENCE', 'WORK EXPERIENCE',
    'EDUCATION', 'CERTIFICATIONS & TRAINING', 'CERTIFICATIONS',
    'ACHIEVEMENTS', 'ACHIVEMENTS', 'EXTRACURRICULAR'
  ];

  const isSection = (line) => SECTION_HEADERS.some(h => line.trim().toUpperCase() === h);
  const isBullet = (line) => Boolean(line.trim().match(/^[-*•\u2013\u2014\u2022\u25cf\u25aa\u25ba\u2192]/));
  const isName = (line, index) => index === 0 && line.trim().length > 0 && line.trim().length < 60;
  const isContact = (line, index) => index === 1 && (line.includes('@') || line.includes('|') || line.includes('+'));

  const addPage = () => {
    doc.addPage();
    y = marginTop;
  };

  const checkPageBreak = (needed) => {
    if (y + needed > pageHeight - marginBottom) {
      addPage();
    }
  };

  lines_raw.forEach((line, index) => {
    const trimmed = cleanResumeString(line.trim());

    if (!trimmed) {
      y += 2.5;
      return;
    }

    // 1. Candidate Name
    if (isName(trimmed, index)) {
      checkPageBreak(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(trimmed, pageWidth / 2, y, { align: 'center' });
      y += 7.5;
      return;
    }

    // 2. Contact Line
    if (isContact(trimmed, index)) {
      checkPageBreak(8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105); // slate-600

      // Split contact items by pipe separator
      const parts = trimmed.split(/\s*\|\s*/);
      const totalWidth = parts.reduce((acc, part, pIdx) => {
        return acc + doc.getTextWidth(part) + (pIdx < parts.length - 1 ? doc.getTextWidth(' | ') : 0);
      }, 0);

      let currentX = Math.max(marginLeft, (pageWidth - totalWidth) / 2);

      parts.forEach((part, pIdx) => {
        let url = null;
        if (part.includes('@')) {
          url = `mailto:${part.trim()}`;
        } else if (/linkedin\.com\/in\/[^\s]+/i.test(part)) {
          const match = part.match(/linkedin\.com\/in\/[^\s]+/i);
          url = `https://www.${match[0].replace(/^www\./i, '')}`;
        } else if (/github\.com\/[^\s]+/i.test(part)) {
          const match = part.match(/github\.com\/[^\s]+/i);
          url = `https://www.${match[0].replace(/^www\./i, '')}`;
        } else if (/leetcode\.com\/[^\s]+/i.test(part)) {
          const match = part.match(/leetcode\.com\/[^\s]+/i);
          url = `https://${match[0]}`;
        } else if (/^https?:\/\//i.test(part)) {
          url = part.trim();
        }

        if (url) {
          doc.textWithLink(part, currentX, y, { url });
        } else {
          doc.text(part, currentX, y);
        }

        currentX += doc.getTextWidth(part);

        if (pIdx < parts.length - 1) {
          doc.text(' | ', currentX, y);
          currentX += doc.getTextWidth(' | ');
        }
      });

      y += 6;
      return;
    }

    // 3. Section Heading
    if (isSection(trimmed)) {
      checkPageBreak(12);
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(trimmed, marginLeft, y);

      // Section underline
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.35);
      doc.line(marginLeft, y + 1, marginLeft + maxWidth, y + 1);
      y += 5.5;
      return;
    }

    // 4. Bullet point
    if (isBullet(trimmed)) {
      checkPageBreak(5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      const bulletText = trimmed.replace(/^[-*•\u2013\u2014\u2022\u25cf\u25aa\u25ba\u2192]\s*/, '');
      const wrappedLines = doc.splitTextToSize(bulletText, maxWidth - 5);
      wrappedLines.forEach((wl, wi) => {
        checkPageBreak(4.5);
        if (wi === 0) {
          doc.text('•', marginLeft, y);
          doc.text(wl, marginLeft + 4, y);
        } else {
          doc.text(wl, marginLeft + 4, y);
        }
        y += 4.2;
      });
      return;
    }

    // 5. Title / Entry line (e.g. Title | Company | Dates)
    if (trimmed.includes(' | ')) {
      checkPageBreak(6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const wrappedLines = doc.splitTextToSize(trimmed, maxWidth);
      wrappedLines.forEach((wl) => {
        checkPageBreak(4.5);
        doc.text(wl, marginLeft, y);
        y += 4.5;
      });
      return;
    }

    // 6. Regular text (e.g., summary, skill category)
    checkPageBreak(5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    // If it's a categorized skill row (Category: skill1, skill2)
    if (trimmed.includes(':') && trimmed.indexOf(':') < 30) {
      const colonIdx = trimmed.indexOf(':');
      const catName = trimmed.slice(0, colonIdx + 1);
      const skillsPart = trimmed.slice(colonIdx + 1);

      doc.setFont('helvetica', 'bold');
      const catWidth = doc.getTextWidth(catName);
      doc.text(catName, marginLeft, y);

      doc.setFont('helvetica', 'normal');
      const wrappedSkills = doc.splitTextToSize(skillsPart, maxWidth - catWidth);
      wrappedSkills.forEach((wl, wi) => {
        if (wi === 0) {
          doc.text(wl, marginLeft + catWidth + 1, y);
        } else {
          y += 4.2;
          checkPageBreak(4.5);
          doc.text(wl, marginLeft, y);
        }
      });
      y += 4.5;
      return;
    }

    // Regular paragraph
    const wrappedLines = doc.splitTextToSize(trimmed, maxWidth);
    wrappedLines.forEach((wl) => {
      checkPageBreak(4.5);
      doc.text(wl, marginLeft, y);
      y += 4.2;
    });
  });

  doc.save(filename);
};
