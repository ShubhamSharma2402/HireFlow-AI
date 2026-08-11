/**
 * Formats resume data into plain text, preferring full rawText when available.
 */
export const formatResumeToText = (resume) => {
  if (!resume) return '';
  if (typeof resume === 'string') return resume;

  if (resume.rawText && typeof resume.rawText === 'string' && resume.rawText.trim().length > 0) {
    return resume.rawText.trim();
  }

  let text = '';
  if (resume.name) text += `${resume.name.toUpperCase()}\n`;
  if (resume.email || resume.phone || resume.linkedin) {
    text += `${[resume.email, resume.phone, resume.linkedin].filter(Boolean).join(' | ')}\n\n`;
  }

  if (resume.summary) {
    text += `PROFESSIONAL SUMMARY\n${resume.summary}\n\n`;
  }

  if (resume.skills && resume.skills.length > 0) {
    text += `SKILLS\n${Array.isArray(resume.skills) ? resume.skills.join(', ') : resume.skills}\n\n`;
  }

  if (resume.experience && resume.experience.length > 0) {
    text += `EXPERIENCE\n`;
    resume.experience.forEach((exp) => {
      if (typeof exp === 'string') {
        text += `${exp}\n`;
      } else {
        text += `\n${exp.title || 'Role'} - ${exp.company || ''} (${exp.duration || ''})\n`;
        if (exp.bullets) {
          exp.bullets.forEach((b) => { text += `  • ${b}\n`; });
        }
      }
    });
    text += '\n';
  }

  if (resume.projects && resume.projects.length > 0) {
    text += `PROJECTS\n`;
    resume.projects.forEach((proj) => {
      if (typeof proj === 'string') {
        text += `${proj}\n`;
      } else {
        text += `\n${proj.name || 'Project'}\n`;
        if (proj.description) text += `${proj.description}\n`;
        if (proj.bullets) proj.bullets.forEach((b) => { text += `  • ${b}\n`; });
      }
    });
    text += '\n';
  }

  if (resume.education && resume.education.length > 0) {
    text += `EDUCATION\n`;
    if (Array.isArray(resume.education)) {
      resume.education.forEach((edu) => {
        text += typeof edu === 'string'
          ? `${edu}\n`
          : `${edu.degree || ''} - ${edu.institution || ''} (${edu.year || ''})\n`;
      });
    }
    text += '\n';
  }

  if (resume.certifications && resume.certifications.length > 0) {
    text += `CERTIFICATIONS\n${resume.certifications.join('\n')}\n`;
  }

  return text.trim();
};

/**
 * Generates and downloads a PDF resume using jsPDF (loaded from CDN).
 */
export const downloadResumeAsPdf = async (resumeText, filename = 'Optimized_Resume.pdf') => {
  if (!resumeText || !resumeText.trim()) {
    throw new Error('No resume content to download.');
  }

  const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 6;
  let y = margin;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const lines = doc.splitTextToSize(resumeText, maxWidth);

  lines.forEach((line) => {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });

  doc.save(filename);
};
