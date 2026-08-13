import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';

const SHEET_ID = '1spNjzhYooefdXyLJhNm3Q31uDm0NzeI6xAvGz4bVh0U';
const GID = '1742286842';

// Tenta gviz/tq primeiro (funciona com "Qualquer um com o link"), depois CSV publicado
const URLS = [
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`,
];

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  const s = String(val).replace('%', '').replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parsePercent(val) {
  if (val === null || val === undefined || val === '') return 0;
  const s = String(val).replace(',', '.').trim();
  if (s.endsWith('%')) return parseFloat(s) / 100;
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}

function mapRow(row) {
  return {
    // Identificação
    superintendente: String(row[4] || '').trim().toUpperCase(),
    gerente: String(row[5] || '').trim().toUpperCase(),
    corretor: String(row[6] || '').trim().toUpperCase(),
    // Período
    dataInicio: row[1],
    dataFim: row[2],
    periodo: parseNum(row[3]),
    // Disciplina
    diasTrabalhados: parseNum(row[7]),
    folgas: parseNum(row[8]),
    antes20h: parseNum(row[9]),
    ate00h: parseNum(row[10]),
    retroativo: parseNum(row[11]),
    streak: parseNum(row[12]),
    // Atividade
    leads: parseNum(row[13]),
    tempoDiscador: parseNum(row[14]),
    repiks: parseNum(row[15]),
    // Funil
    agendForm1: parseNum(row[16]),
    agendForm2: parseNum(row[17]),
    divAgend: parseNum(row[18]),
    visitasForm1: parseNum(row[19]),
    visitasForm3: parseNum(row[20]),
    divVisitas: parseNum(row[21]),
    propostas: parseNum(row[22]),
    preVendas: parseNum(row[23]),
    // Taxas
    noShow: parsePercent(row[24]),
    taxaLeadAgend: parsePercent(row[25]),
    taxaAgendVisita: parsePercent(row[26]),
    taxaVisitaConv: parsePercent(row[27]),
    // Gerente
    visitasComGerente: parseNum(row[28]),
    taxaParticipacaoGerente: parsePercent(row[29]),
    taxaConvGerente: parsePercent(row[30]),
    // Canais Agendamento (colunas AF..AQ = índices 31..42)
    canaisAg: {
      'Google ADS': parsePercent(row[31]),
      'Facebook FC': parsePercent(row[32]),
      'RD Gold': parsePercent(row[33]),
      'Facebook RD': parsePercent(row[34]),
      'Canal Investidor': parsePercent(row[35]),
      'Carteira': parsePercent(row[36]),
      'Relâmpago ll': parsePercent(row[37]),
      'Canal Elite': parsePercent(row[38]),
      'Telefone': parsePercent(row[39]),
      'Prom. Relâmpago': parsePercent(row[40]),
      'Discador 01': parsePercent(row[41]),
      'Outros': parsePercent(row[42]),
    },
    // Canais Visitas (índices 43..54)
    canaisVs: {
      'Google ADS': parsePercent(row[43]),
      'Facebook FC': parsePercent(row[44]),
      'RD Gold': parsePercent(row[45]),
      'Facebook RD': parsePercent(row[46]),
      'Canal Investidor': parsePercent(row[47]),
      'Carteira': parsePercent(row[48]),
      'Relâmpago ll': parsePercent(row[49]),
      'Canal Elite': parsePercent(row[50]),
      'Telefone': parsePercent(row[51]),
      'Prom. Relâmpago': parsePercent(row[52]),
      'Discador 01': parsePercent(row[53]),
      'Outros': parsePercent(row[54]),
    },
    // SICAQ
    sicaqQtd: parseNum(row[56]),
    sicaqPerc: parsePercent(row[57]),
    // Agenda período
    agendaPeriodo: parseNum(row[59]),
  };
}

export function useSheetData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    let raw = null;
    let lastErr = null;

    for (const url of URLS) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        raw = await res.text();
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!raw) {
      setError(`Não foi possível acessar a planilha. Verifique se ela está publicada na web.\n\nDetalhes: ${lastErr?.message}`);
      setLoading(false);
      return;
    }

    const parsed = Papa.parse(raw, { skipEmptyLines: true });
    const rows = parsed.data;

    if (rows.length < 3) {
      setError('Planilha sem dados suficientes (precisa de pelo menos cabeçalho + média + 1 corretor).');
      setLoading(false);
      return;
    }

    // Linha 0 = cabeçalho, linha 1 = média do time, linhas 2+ = corretores
    const mediaRow = mapRow(rows[1]);
    const corretores = rows.slice(2)
      .filter(r => r[6] && String(r[6]).trim() !== '')
      .map(mapRow);

    const superintendentes = [...new Set(corretores.map(c => c.superintendente))].filter(Boolean).sort();
    const gerentes = [...new Set(corretores.map(c => c.gerente))].filter(Boolean).sort();

    setData({ media: mediaRow, corretores, superintendentes, gerentes });
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData, lastUpdate };
}
