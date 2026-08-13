export const fmt = {
  pct: (v, dec = 0) => `${(v * 100).toFixed(dec)}%`,
  num: (v, dec = 0) => Number(v).toFixed(dec),
  int: (v) => Math.round(v),
};

export function topCanais(canaisObj, top = 3) {
  return Object.entries(canaisObj)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top);
}

export function scoreEngajamento(c) {
  // Score 0-100 baseado em disciplina + atividade
  const disciplina = c.diasTrabalhados > 0 ? Math.min(1, (c.antes20h + c.ate00h) / Math.max(1, c.diasTrabalhados)) : 0;
  const atividade = Math.min(1, c.leads / 30); // normalizado em 30 leads
  const performance = Math.min(1, c.taxaLeadAgend * 3);
  return Math.round((disciplina * 0.4 + atividade * 0.3 + performance * 0.3) * 100);
}

export function classificarCorretor(c) {
  const score = scoreEngajamento(c);
  if (c.diasTrabalhados === 0) return { label: 'Sem dados', color: '#6b7280', bg: '#1f2937' };
  if (score >= 70) return { label: 'Em destaque', color: '#f59e0b', bg: '#1c1500' };
  if (score >= 40) return { label: 'Regular', color: '#60a5fa', bg: '#0f1729' };
  return { label: 'Atenção', color: '#f87171', bg: '#1f0f0f' };
}
