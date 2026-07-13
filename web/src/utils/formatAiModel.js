/** Human-readable label for AI model used in a generation step. */
export function formatAiModelLabel(model, rewriteModel) {
  if (model?.trim()) {
    const m = model.trim();
    if (m.startsWith('bluesminds/')) return m.replace('bluesminds/', '');
    if (m.startsWith('clod/')) return m.replace('clod/', '');
    if (m.startsWith('deepseek/')) return m.replace('deepseek/', '');
    return m;
  }
  if (rewriteModel === 'gpt') return 'GPT';
  if (rewriteModel === 'groq') return 'Groq';
  if (rewriteModel?.trim()) return rewriteModel.trim();
  return '';
}
