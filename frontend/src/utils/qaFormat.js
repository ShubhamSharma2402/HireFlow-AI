const normalizeQAItem = (item) => {
  if (!item || typeof item !== 'object') return null;

  const question = String(item.question || item.q || item.Question || '').trim();
  const answer = String(item.answer || item.a || item.Answer || item.response || '').trim();
  const tips = String(item.tips || item.tip || item.Tips || '').trim();

  if (!question && !answer) return null;

  return {
    question: question || 'Interview Question',
    answer: answer || 'Prepare a concise answer based on your experience.',
    tips: tips || 'Highlight key achievements and metrics.',
  };
};

/**
 * Normalizes Q&A data from various backend/LLM response shapes into a consistent array.
 */
export const normalizeQAList = (data) => {
  if (!data) return [];

  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map(normalizeQAItem).filter(Boolean);
  }

  if (parsed && typeof parsed === 'object') {
    const nested =
      parsed.qaList ||
      parsed.questions ||
      parsed.qa ||
      parsed.interviewQuestions ||
      parsed.items;

    if (Array.isArray(nested)) {
      return nested.map(normalizeQAItem).filter(Boolean);
    }
  }

  return [];
};
