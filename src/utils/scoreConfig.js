/**
 * scoreConfig.js — Régua de pontuação do corretor (processo, não resultado).
 *
 * FILOSOFIA: o score mede o que está sob controle do corretor ANTES da visita —
 * estar presente, preencher com responsabilidade e agendar. Visita, proposta,
 * pré-venda e SV dependem do gerente/secretaria e NÃO entram aqui de propósito.
 *
 * Toda constante mora neste arquivo. Nenhum número mágico espalhado no código.
 */

export const SCORE_CFG = {
  // --- Pesos dos 4 componentes (devem somar 1) ---
  pesos: {
    presenca:    0.35,
    disciplina:  0.25,
    atividade:   0.15,
    agendamento: 0.25,
  },

  // --- Qualidade do preenchimento ---
  // Pós-20h NÃO perde ponto: quem preenche tarde geralmente é quem ficou
  // trabalhando (corujão de quinta, cliente até tarde). Punir isso treinaria
  // o time a entregar relatório incompleto às 18h.
  // Retroativo = folga automática que o gerente teve que reverter cobrando.
  disciplina: {
    noPrazo:    1.00,
    pos20h:     1.00,
    retroativo: 0.25,
  },

  // --- Folgas ---
  // A folga é gerada automaticamente pelo robô das 00h para quem não preencheu.
  // Cota: 1 folga a cada 7 dias elegíveis não pesa. Acima disso, reduz presença.
  // Folga ENCADEADA é fenômeno diferente (desengajamento) e tem penalidade própria.
  folga: {
    cotaPorSemana:   1,
    diasDaSemana:    7,
    sequenciaLivre:  2,   // até 2 folgas seguidas não penaliza
    pontosPorExtra:  5,   // -5 pts por folga seguida além da 2ª
    penalidadeMax:   15,
  },

  // --- Agendamento: volume pesa mais que taxa (empenho é volume) ---
  agendamento: {
    pesoVolume: 0.60,
    pesoTaxa:   0.40,
  },

  // --- Régua relativa (mediana do time) ---
  referencia: {
    minDiasParaEntrar: 3,   // corretor com <3 dias não define a régua de ninguém
    minCorretores:     15,  // abaixo disso: régua PROVISÓRIA, sem selo
    fatorTeto:         1.5, // atingir 150% da mediana = teto do componente
  },

  // --- Ativação de SUP (rollout escalonado) ---
  // O SUP entra na régua no 1º dia com preenchimento real. Trava para não ligar
  // a cobrança de 45 pessoas por causa de 1 curioso que abriu o formulário.
  ativacaoSup: {
    minCorretoresNoDia:   3,
    minDiasConsecutivos:  2,
  },

  // Override manual: { SEIXAS: '2026-08-06' } força a data de início do SUP.
  overrideInicioSup: {},

  // --- Faixas ---
  // PROVISÓRIAS. Recalibrar rodando a distribuição real depois de ~3 semanas
  // de preenchimento do piloto. Não tratar como definitivo.
  faixas: {
    destaque: 65,
    regular:  35,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function mediana(arr) {
  const v = arr.filter(x => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return 0;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Componente relativo: valor do corretor vs mediana do time.
// Devolve null quando não há régua (mediana 0) — o peso é redistribuído.
function relativo(valor, ref) {
  if (!ref || ref <= 0) return null;
  const teto = ref * SCORE_CFG.referencia.fatorTeto;
  return Math.max(0, Math.min(1, valor / teto));
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

/**
 * calcularScore(c, ref)
 * @param c   objeto do corretor vindo do calcEngine
 * @param ref data.referencia (medianas do time no período)
 * @returns { score, componentes[], penalidades[], provisorio, naoIniciado }
 */
export function calcularScore(c, refArg) {
  // A referência pode vir por parâmetro OU embutida no próprio corretor (_ref),
  // que o calcEngine anexa. Isso permite que telas antigas chamem
  // statusCorretor(c) sem argumento e ainda usem a régua correta.
  const ref = refArg || c?._ref || null;
  const P = SCORE_CFG.pesos;
  const D = SCORE_CFG.disciplina;
  const F = SCORE_CFG.folga;
  const A = SCORE_CFG.agendamento;

  const vazio = {
    score: null, componentes: [], penalidades: [],
    provisorio: false, naoIniciado: true, motivo: '',
  };

  if (!c) return vazio;

  // SUP ainda não iniciou a cobrança, ou corretor sem nenhum dia elegível
  if (!c.supAtivo)          return { ...vazio, motivo: 'Superintendência ainda não iniciada' };
  if (!c.diasElegiveis)     return { ...vazio, motivo: 'Sem dias elegíveis no período' };

  const T = c.diasTrabalhados || 0;
  const provisorio = !ref || (ref.n || 0) < SCORE_CFG.referencia.minCorretores;

  // 1) PRESENÇA — apareceu? Denominador = dias elegíveis menos a cota de folga.
  const cota = Math.floor(c.diasElegiveis / F.diasDaSemana) * F.cotaPorSemana;
  const baseP = Math.max(1, c.diasElegiveis - cota);
  const presenca = Math.max(0, Math.min(1, T / baseP));

  // 2) DISCIPLINA — nos dias que apareceu, como preencheu?
  const disciplina = T > 0
    ? Math.min(1, (c.antes20h * D.noPrazo + c.ate00h * D.pos20h + c.retroativo * D.retroativo) / T)
    : 0;

  // 3) ATIVIDADE — leads por dia trabalhado (proxy de estar online e na fila)
  const leadsDia  = T > 0 ? c.leads / T : 0;
  const atividade = relativo(leadsDia, ref?.leadsDia);

  // 4) AGENDAMENTO — volume por dia + eficiência sobre os leads
  const agendDia = T > 0 ? c.agendForm2 / T : 0;
  const relVol   = relativo(agendDia, ref?.agendDia);
  const relTaxa  = relativo(c.taxaLeadAgend, ref?.taxaLeadAgend);
  const agendamento = (relVol === null && relTaxa === null)
    ? null
    : (A.pesoVolume * (relVol ?? 0) + A.pesoTaxa * (relTaxa ?? 0));

  const brutos = [
    { chave:'presenca',    label:'Presença',    peso:P.presenca,    pct:presenca,
      valor:`${T} de ${c.diasElegiveis} dias`,
      refTxt: cota > 0 ? `cota de ${cota} folga${cota>1?'s':''}` : 'sem cota no período' },
    { chave:'disciplina',  label:'Disciplina',  peso:P.disciplina,  pct:disciplina,
      valor:`${c.antes20h} no prazo · ${c.ate00h} pós-20h · ${c.retroativo} cobrado${c.retroativo===1?'':'s'}`,
      refTxt:'pós-20h vale igual a no prazo' },
    { chave:'atividade',   label:'Atividade',   peso:P.atividade,   pct:atividade,
      valor:`${leadsDia.toFixed(1)} leads/dia`,
      refTxt: ref?.leadsDia ? `mediana do time ${ref.leadsDia.toFixed(1)}` : 'sem régua' },
    { chave:'agendamento', label:'Agendamento', peso:P.agendamento, pct:agendamento,
      valor:`${agendDia.toFixed(1)} agend/dia · ${(c.taxaLeadAgend*100).toFixed(0)}% dos leads`,
      refTxt: ref?.agendDia ? `mediana do time ${ref.agendDia.toFixed(1)}` : 'sem régua' },
  ];

  // Redistribui o peso dos componentes sem régua entre os que têm
  const validos  = brutos.filter(b => b.pct !== null);
  const pesoBom  = validos.reduce((s, b) => s + b.peso, 0) || 1;

  const componentes = brutos.map(b => {
    if (b.pct === null) return { ...b, pesoEfetivo:0, pontos:0, semRegua:true };
    const pesoEfetivo = b.peso / pesoBom;
    return { ...b, pesoEfetivo, pontos: b.pct * pesoEfetivo * 100, semRegua:false };
  });

  const bruto = componentes.reduce((s, b) => s + b.pontos, 0);

  // Penalidade por folgas encadeadas
  const penalidades = [];
  const seq = c.maiorSeqFolgas || 0;
  if (seq > F.sequenciaLivre) {
    const pts = Math.min(F.penalidadeMax, (seq - F.sequenciaLivre) * F.pontosPorExtra);
    penalidades.push({ label:`${seq} folgas consecutivas`, pontos:-pts });
  }
  const totalPen = penalidades.reduce((s, p) => s + p.pontos, 0);

  return {
    score: Math.max(0, Math.min(100, Math.round(bruto + totalPen))),
    componentes, penalidades, provisorio, naoIniciado:false, motivo:'',
  };
}

/**
 * statusCorretor(c, ref) — faixa + cor. Sem selo quando a régua é provisória.
 */
export function statusCorretor(c, ref) {
  const r = calcularScore(c, ref || c?._ref || null);

  if (r.naoIniciado) {
    return { ...r, label:'Não iniciado', color:'#6b7280', bg:'#1f2937', score:null };
  }
  if (r.provisorio) {
    return { ...r, label:'Régua provisória', color:'#94a3b8', bg:'#1f2937' };
  }
  if (r.score >= SCORE_CFG.faixas.destaque) {
    return { ...r, label:'Destaque', color:'#f59e0b', bg:'#1c1500' };
  }
  if (r.score >= SCORE_CFG.faixas.regular) {
    return { ...r, label:'Regular', color:'#60a5fa', bg:'#0f1729' };
  }
  return { ...r, label:'Atenção', color:'#f87171', bg:'#1f0f0f' };
}
