/**
 * calcEngine.js — Motor de cálculo idêntico ao popularMetricasPeriodoV3 do GAS.
 * Recebe dados brutos + período e devolve o mesmo objeto `data` que o app já usa.
 */

const CANAIS = [
  'GOOGLE ADS FALECONOSCO','FACEBOOK FALECONOSCO','RD GOLD','FACEBOOK RD GOLD',
  'CANAL INVESTIDOR','CARTEIRA CORRETOR','CANAL RELÂMPAGO LL','CANAL ELITE',
  'TELEFONE','PROMOÇÃO RELÂMPAGO','DISCADOR 01',
];

// Normaliza canal para o mapa de canais (mesma lógica do GAS)
function normalizarCanal(canal) {
  const c = String(canal||'').toUpperCase().trim();
  for (const k of CANAIS) {
    if (c === k || c.includes(k)) return k;
  }
  // Typo do GAS: FELECONOSCO
  if (c.includes('FELECONOSCO') || c.includes('FALECONOSCO')) {
    if (c.includes('FACEBOOK')) return 'FACEBOOK FALECONOSCO';
    if (c.includes('GOOGLE'))   return 'GOOGLE ADS FALECONOSCO';
  }
  return 'OUTROS';
}

// Extrai minutos de texto livre ("15 min", "1h", "30")
function extrairMinutos(v) {
  const s = String(v||'');
  const h = s.match(/(\d+)\s*h/i);
  if (h) return parseInt(h[1]) * 60;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function d0(date) {
  if (!date) return null;
  const d = new Date(date); d.setHours(0,0,0,0); return d;
}

// Verifica se data está dentro do intervalo [ini, fim] (já normalizados)
function inRange(date, ini, fim) {
  const d = d0(date);
  if (!d) return false;
  return d >= ini && d <= fim;
}

// Cálculo de streak (igual ao calcularStreakReal do GAS)
function calcularStreak(controle, corretor) {
  const linhasCorretor = controle
    .filter(r => r.corretor === corretor)
    .sort((a,b) => b.data - a.data);
  
  const ontem = new Date(); ontem.setDate(ontem.getDate()-1); ontem.setHours(0,0,0,0);
  
  for (const r of linhasCorretor) {
    if (r.status.toLowerCase().includes('folga')) {
      const diff = Math.floor((ontem - d0(r.data)) / 86400000);
      return Math.max(0, diff);
    }
  }
  return 0;
}

/**
 * Calcula métricas de UM corretor para um período.
 * Lógica idêntica à popularMetricasPeriodoV3 do GAS.
 */
function calcularCorretor(raw, nome, ini, fim) {
  const { form1, form2, form3, controle } = raw;
  const iniD = d0(ini); const fimD = d0(fim);
  const fimLogica = new Date(fim); fimLogica.setHours(23,59,59,999);

  const m = {
    diasTrabalhados: 0, folgas: 0, antes20h: 0, ate00h: 0, retroativo: 0,
    leads: 0, tempoDiscador: 0, repiks: 0,
    agendForm1: 0, agendForm2: 0, agendadosParaOPeriodo: 0, sicaqAprovados: 0,
    visitasForm1: 0, visitasForm3: 0,
    propostas: 0, preVendas: 0, vendaSV: 0, conversoesTotal: 0,
    visitasComGerente: 0, conversoesComGerente: 0,
    canaisAg: {}, canaisVs: {},
  };
  CANAIS.forEach(c => { m.canaisAg[c]=0; m.canaisVs[c]=0; });
  m.canaisAg['OUTROS']=0; m.canaisVs['OUTROS']=0;

  // Form 1
  for (const r of form1) {
    if (r.corretor === nome && inRange(r.data, iniD, fimLogica)) {
      m.leads        += r.leads;
      m.tempoDiscador += extrairMinutos(r.discador);
      m.agendForm1   += r.agendForm1;
      m.visitasForm1 += r.visitasForm1;
      m.repiks       += r.repiks;
    }
  }

  // Form 2
  for (const r of form2) {
    if (r.corretor !== nome) continue;
    // Agendamentos feitos dentro do período
    if (inRange(r.dataInput, iniD, fimLogica)) {
      m.agendForm2++;
      if (r.sicaq.includes('SIM') || r.sicaq.includes('APROVADO')) m.sicaqAprovados++;
      const key = normalizarCanal(r.canal);
      m.canaisAg[key] = (m.canaisAg[key]||0) + 1;
    }
    // Visitas agendadas para cair no período
    if (r.dataVisita && inRange(r.dataVisita, iniD, fimLogica)) {
      m.agendadosParaOPeriodo++;
    }
  }

  // Form 3
  for (const r of form3) {
    if (r.corretor !== nome) continue;
    if (!inRange(r.data, iniD, fimLogica)) continue;
    m.visitasForm3++;

    const res = r.resultado;
    // Detecta Venda SV (mais específico primeiro)
    const isVendaSV   = res.includes('SV') || res.includes('VENDA SV') || res.includes('SECRETARIA');
    // Detecta Pré-Venda
    const isPreVenda  = !isVendaSV && (res.includes('PRÉ') || res.includes('PRE'));
    // Detecta Proposta Assinada
    const isProposta  = !isVendaSV && !isPreVenda &&
                        (res.includes('PROPOSTA') || res.includes('ASSINADA') || res.includes('INTEN'));
    const conv = isVendaSV || isPreVenda || isProposta;

    if (conv) {
      m.conversoesTotal++;
      if (isProposta) m.propostas++;
      if (isPreVenda) m.preVendas++;
      if (isVendaSV)  m.vendaSV++;
      const key = normalizarCanal(r.canal);
      m.canaisVs[key] = (m.canaisVs[key]||0) + 1;
    }
    if (r.gerente.includes('SIM')) {
      m.visitasComGerente++;
      if (conv) m.conversoesComGerente++;
    }
  }

  // CONTROLE_DIARIO — disciplina
  for (const r of controle) {
    if (r.corretor !== nome) continue;
    if (!inRange(r.data, iniD, fimLogica)) continue;
    const s = r.status;
    if (s.toLowerCase().includes('folga')) {
      m.folgas++;
    } else if (!s.toLowerCase().includes('pendente')) {
      m.diasTrabalhados++;
      if (s.includes('No Prazo'))    m.antes20h++;
      else if (s.includes('Atrasado'))   m.ate00h++;
      else if (s.includes('Retroativo')) m.retroativo++;
    }
  }

  // Taxas derivadas
  const div = (a,b) => b > 0 ? a/b : 0;
  const noShowRaw = Math.max(0, m.agendadosParaOPeriodo - m.visitasForm3);
  m.noShow            = div(noShowRaw, m.agendadosParaOPeriodo);
  m.taxaLeadAgend     = div(m.agendForm2, m.leads);
  m.taxaAgendVisita   = div(m.visitasForm3, m.agendForm2);
  m.taxaVisitaConv    = div(m.conversoesTotal, m.visitasForm3);
  m.taxaPartGerente   = div(m.visitasComGerente, m.visitasForm3);
  m.taxaConvGerente   = div(m.conversoesComGerente, m.visitasComGerente);
  m.sicaqPerc         = div(m.sicaqAprovados, m.agendForm2);
  m.divAgend          = m.agendForm1 - m.agendForm2;
  m.divVisitas        = m.visitasForm1 - m.visitasForm3;
  m.streak            = calcularStreak(controle, nome);

  // Normalizar canaisAg/canaisVs para percentuais (igual ao GAS)
  const tAg  = m.agendForm1  || 1;
  const tVis = m.visitasForm1 || 1;
  const canaisAg = {}, canaisVs = {};
  [...CANAIS, 'OUTROS'].forEach(k => {
    canaisAg[mapCanal(k)] = (m.canaisAg[k]||0) / tAg;
    canaisVs[mapCanal(k)] = (m.canaisVs[k]||0) / tVis;
  });

  return { ...m, canaisAg, canaisVs, agendaPeriodo: m.agendadosParaOPeriodo };
}

// Mapa de nomes para o formato curto usado no app
function mapCanal(k) {
  const MAP = {
    'GOOGLE ADS FALECONOSCO': 'Google ADS',
    'FACEBOOK FALECONOSCO':   'Facebook FC',
    'RD GOLD':                'RD Gold',
    'FACEBOOK RD GOLD':       'Facebook RD',
    'CANAL INVESTIDOR':       'Canal Investidor',
    'CARTEIRA CORRETOR':      'Carteira',
    'CANAL RELÂMPAGO LL':     'Relâmpago ll',
    'CANAL ELITE':            'Canal Elite',
    'TELEFONE':               'Telefone',
    'PROMOÇÃO RELÂMPAGO':     'Prom. Relâmpago',
    'DISCADOR 01':            'Discador 01',
    'OUTROS':                 'Outros',
  };
  return MAP[k] || k;
}

/**
 * Constrói hierarquia de todos os corretores que apareceram no CONTROLE
 * durante o período selecionado — inclui ex-funcionários.
 */
function buildHierarquia(raw, iniD, fimLogica) {
  const { controle, cadastro } = raw;

  // Hierarquia base: cadastro atual (mais confiável para ativos)
  const hier = {};
  for (const r of cadastro) {
    if (r.cargo === 'Corretor') {
      hier[r.nome] = { super_: r.super_, gerente: r.gerente, ativo: r.status === 'Ativo' };
    }
  }

  // Adiciona quem aparece no CONTROLE no período (ex-funcionários incluídos)
  for (const r of controle) {
    if (!inRange(r.data, iniD, fimLogica)) continue;
    if (!hier[r.corretor]) {
      hier[r.corretor] = { super_: r.super_, gerente: r.gerente, ativo: false };
    }
  }

  return hier;
}

/**
 * Calcula o período anterior automaticamente (mesmo número de dias, imediatamente antes).
 */
export function calcularPeriodoAnterior(ini, fim) {
  const diff = fim.getTime() - ini.getTime();
  const fimAnt  = new Date(ini.getTime() - 86400000); // 1 dia antes do início
  const iniAnt  = new Date(fimAnt.getTime() - diff);
  return { ini: iniAnt, fim: fimAnt };
}

/**
 * Função principal — equivalente ao popularMetricasPeriodo do GAS.
 * Devolve o mesmo objeto `data` que o app já usa em todas as páginas.
 */
export function calcularData(raw, ini, fim) {
  if (!raw || !ini || !fim) return null;

  const iniD = d0(ini);
  const fimLogica = new Date(fim); fimLogica.setHours(23,59,59,999);
  const diasPeriodo = Math.ceil((fimLogica - iniD) / 86400000);
  const dataInicio = iniD.toLocaleDateString('pt-BR');
  const dataFim    = d0(fim).toLocaleDateString('pt-BR');

  const hier = buildHierarquia(raw, iniD, fimLogica);

  // Calcula todos os corretores que aparecem na hierarquia
  const corretores = Object.entries(hier)
    .map(([nome, h]) => {
      const m = calcularCorretor(raw, nome, ini, fim);
      return {
        // Identidade
        corretor: nome, superintendente: h.super_, gerente: h.gerente,
        dataInicio, dataFim, periodo: diasPeriodo,
        // Disciplina
        diasTrabalhados: m.diasTrabalhados, folgas: m.folgas,
        antes20h: m.antes20h, ate00h: m.ate00h, retroativo: m.retroativo,
        streak: m.streak,
        // Atividade
        leads: m.leads, tempoDiscador: m.tempoDiscador, repiks: m.repiks,
        // Funil
        agendForm1: m.agendForm1, agendForm2: m.agendForm2,
        divAgend: m.divAgend, visitasForm1: m.visitasForm1,
        visitasForm3: m.visitasForm3, divVisitas: m.divVisitas,
        propostas: m.propostas, preVendas: m.preVendas, vendaSV: m.vendaSV,
        // Taxas
        noShow: m.noShow, taxaLeadAgend: m.taxaLeadAgend,
        taxaAgendVisita: m.taxaAgendVisita, taxaVisitaConv: m.taxaVisitaConv,
        // Gerente
        visitasComGerente: m.visitasComGerente,
        taxaPartGerente: m.taxaPartGerente, taxaConvGerente: m.taxaConvGerente,
        // Canais
        canaisAg: m.canaisAg, canaisVs: m.canaisVs,
        // SICAQ
        sicaqQtd: m.sicaqAprovados, sicaqPerc: m.sicaqPerc,
        agendaPeriodo: m.agendaPeriodo,
      };
    })
    .sort((a,b) => {
      if (a.superintendente < b.superintendente) return -1;
      if (a.superintendente > b.superintendente) return 1;
      if (a.gerente < b.gerente) return -1;
      if (a.gerente > b.gerente) return 1;
      return a.corretor.localeCompare(b.corretor);
    });

  // Média real dos corretores com dados
  const ativos = corretores.filter(c => c.diasTrabalhados > 0);
  const avg = fn => ativos.length ? ativos.reduce((s,c) => s + fn(c), 0) / ativos.length : 0;

  const media = {
    corretor: 'MÉDIA DO TIME',
    superintendente: '', gerente: '',
    dataInicio, dataFim, periodo: diasPeriodo,
    diasTrabalhados: avg(c=>c.diasTrabalhados), folgas: avg(c=>c.folgas),
    antes20h: avg(c=>c.antes20h), ate00h: avg(c=>c.ate00h),
    retroativo: avg(c=>c.retroativo), streak: avg(c=>c.streak),
    leads: avg(c=>c.leads), tempoDiscador: avg(c=>c.tempoDiscador),
    repiks: avg(c=>c.repiks), agendForm1: avg(c=>c.agendForm1),
    agendForm2: avg(c=>c.agendForm2), visitasForm1: avg(c=>c.visitasForm1),
    visitasForm3: avg(c=>c.visitasForm3), propostas: avg(c=>c.propostas),
    preVendas: avg(c=>c.preVendas), vendaSV: avg(c=>c.vendaSV), noShow: avg(c=>c.noShow),
    taxaLeadAgend: avg(c=>c.taxaLeadAgend), taxaAgendVisita: avg(c=>c.taxaAgendVisita),
    taxaVisitaConv: avg(c=>c.taxaVisitaConv), visitasComGerente: avg(c=>c.visitasComGerente),
    taxaPartGerente: avg(c=>c.taxaPartGerente), taxaConvGerente: avg(c=>c.taxaConvGerente),
    sicaqQtd: avg(c=>c.sicaqQtd), sicaqPerc: avg(c=>c.sicaqPerc),
    canaisAg: {}, canaisVs: {},
  };

  const supers   = [...new Set(corretores.map(c=>c.superintendente))].filter(Boolean).sort();
  const gerentes = [...new Set(corretores.map(c=>c.gerente))].filter(Boolean).sort();

  return { media, corretores, supers, gerentes };
}
