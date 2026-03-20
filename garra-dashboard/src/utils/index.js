// ---- Formatação ----
export const fmt = {
  pct: (v, dec=0) => `${(v*100).toFixed(dec)}%`,
  num: (v, dec=0) => Number(v).toFixed(dec),
  int: (v) => Math.round(v),
};

export function topCanais(obj, top=3) {
  return Object.entries(obj).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,top);
}

// ---- Semáforo ----
// ratio: valor do corretor / valor da média
export function semaforo(valor, media, inverso=false) {
  if (media === 0) return 'neutro';
  const ratio = valor / media;
  if (inverso) {
    if (ratio <= 0.8) return 'verde';
    if (ratio <= 1.2) return 'amarelo';
    return 'vermelho';
  }
  if (ratio >= 0.8) return 'verde';
  if (ratio >= 0.4) return 'amarelo';
  return 'vermelho';
}

export const semaforoInfo = {
  verde:    { icon:'🟢', color:'#34d399', bg:'rgba(52,211,153,0.12)' },
  amarelo:  { icon:'🟡', color:'#fbbf24', bg:'rgba(251,191,36,0.12)' },
  vermelho: { icon:'🔴', color:'#f87171', bg:'rgba(248,113,113,0.12)' },
  neutro:   { icon:'⚪', color:'#94a3b8', bg:'rgba(148,163,184,0.08)' },
};

// ---- Score de engajamento (0-100) ----
export function scoreEngajamento(c) {
  const disciplina = c.diasTrabalhados > 0
    ? Math.min(1, (c.antes20h + c.ate00h) / c.diasTrabalhados) : 0;
  const atividade  = Math.min(1, c.leads / 30);
  const perf       = Math.min(1, c.taxaLeadAgend * 4);
  return Math.round((disciplina*0.4 + atividade*0.3 + perf*0.3)*100);
}

export function statusCorretor(c) {
  const score = scoreEngajamento(c);
  if (c.diasTrabalhados === 0) return { label:'Sem dados', color:'#6b7280', bg:'#1f2937', score:0 };
  if (score >= 65) return { label:'Destaque', color:'#f59e0b', bg:'#1c1500', score };
  if (score >= 35) return { label:'Regular',  color:'#60a5fa', bg:'#0f1729', score };
  return { label:'Atenção', color:'#f87171', bg:'#1f0f0f', score };
}

// ---- Consolidar um grupo de corretores ----
export function consolidar(lista) {
  if (!lista.length) return null;
  const ativos = lista.filter(c=>c.diasTrabalhados>0);
  const sum = (fn) => lista.reduce((s,c)=>s+fn(c),0);
  const avg = (fn) => ativos.length ? ativos.reduce((s,c)=>s+fn(c),0)/ativos.length : 0;
  const totalLeads  = sum(c=>c.leads);
  const totalAgend  = sum(c=>c.agendForm2);
  const totalVis    = sum(c=>c.visitasForm3);
  const totalPV       = sum(c=>c.preVendas);
  const totalProp     = sum(c=>c.propostas||0);
  const totalVendaSV  = sum(c=>c.vendaSV||0);
  return {
    total: lista.length, ativos: ativos.length,
    leads: totalLeads, agend: totalAgend, visitas: totalVis,
    propostas: totalProp, preVendas: totalPV, vendaSV: totalVendaSV,
    txLeadAgend:   totalLeads  > 0 ? totalAgend/totalLeads  : 0,
    txAgendVisita: totalAgend  > 0 ? totalVis/totalAgend    : 0,
    txConv:        totalVis    > 0 ? (totalProp+totalPV+totalVendaSV)/totalVis : 0,
    engajamento:   avg(c => c.diasTrabalhados > 0
      ? (c.antes20h+c.ate00h)/c.diasTrabalhados : 0),
    repiks:        sum(c=>c.repiks),
    tempoDiscador: sum(c=>c.tempoDiscador),
    streak:        avg(c=>c.streak),
    folgas:        sum(c=>c.folgas),
  };
}

// ---- Ponto de atenção de uma equipe ----
// Retorna o corretor que mais puxa para baixo em cada métrica
export function pontosDeAtencao(corretores, media) {
  const alertas = [];
  const semDados = corretores.filter(c=>c.diasTrabalhados===0);
  if (semDados.length) {
    alertas.push({ nivel:'vermelho', msg:`${semDados.length} corretor(es) sem nenhum registro: ${semDados.map(c=>c.corretor).join(', ')}` });
  }
  const baixoEngaj = corretores.filter(c=> c.diasTrabalhados > 0 &&
    (c.antes20h+c.ate00h)/c.diasTrabalhados < 0.5);
  if (baixoEngaj.length) {
    alertas.push({ nivel:'amarelo', msg:`Baixo engajamento: ${baixoEngaj.map(c=>c.corretor).join(', ')}` });
  }
  const muitasFolgas = corretores.filter(c=>c.folgas > 5);
  if (muitasFolgas.length) {
    alertas.push({ nivel:'vermelho', msg:`Mais de 5 folgas: ${muitasFolgas.map(c=>`${c.corretor} (${c.folgas})`).join(', ')}` });
  }
  return alertas;
}
