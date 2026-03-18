/**
 * useVendasExternas v2 — lê PBI_VENDAS e PBI_CORRETORES do Google Sheets.
 * Os dados chegam via robô Playwright → Webhook GAS → Sheets.
 *
 * Detecção automática de colunas:
 *   PBI_VENDAS: procura coluna com nome do corretor + coluna com tipo de venda
 *   PBI_CORRETORES: procura corretor + dias sem vender
 */
import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { csvUrl, GID } from '../config';

export const TIPOS_VENDA = ['proposta', 'preVenda', 'vendaSV'];
export const LABEL_VENDA = {
  proposta: 'Proposta Assinada',
  preVenda: 'Pré-Venda',
  vendaSV:  'Venda SV',
};

// Detecta o tipo de venda pelo texto da célula
function detectarTipo(texto) {
  const t = String(texto || '').toUpperCase();
  if (t.includes('VENDA SV') || t.includes('SV') || t.includes('SECRETARIA')) return 'vendaSV';
  if (t.includes('PRÉ') || t.includes('PRE') || t.includes('PRE-VENDA') || t.includes('PRÉ-VENDA')) return 'preVenda';
  if (t.includes('PROPOSTA') || t.includes('ASSINADA') || t.includes('INTEN')) return 'proposta';
  return null;
}

// Encontra índice da coluna pelo conteúdo do cabeçalho
function acharColuna(headers, termos) {
  const idx = headers.findIndex(h =>
    termos.some(t => String(h || '').toUpperCase().includes(t.toUpperCase()))
  );
  return idx >= 0 ? idx : null;
}

// Parseia PBI_VENDAS — retorna mapa { corretor → { proposta, preVenda, vendaSV, detalhes[] } }
function parsearVendas(rows) {
  if (!rows || rows.length < 2) return {};
  const headers = rows[0].map(h => String(h || '').toUpperCase().trim());

  // Detecta colunas automaticamente
  const colCorretor = acharColuna(headers, ['CORRETOR', 'VENDEDOR', 'NOME DO CORRETOR', 'NOME']);
  const colStatus   = acharColuna(headers, ['STATUS', 'TIPO', 'ETAPA', 'FASE', 'SITUAÇÃO', 'SITUACAO']);
  const colCliente  = acharColuna(headers, ['CLIENTE', 'COMPRADOR', 'NOME CLIENTE']);
  const colData     = acharColuna(headers, ['DATA', 'DT VENDA', 'DATA VENDA']);
  const colVGV      = acharColuna(headers, ['VGV', 'VALOR', 'VLR', 'VLRVENDA']);

  if (colCorretor === null) {
    console.warn('[PBI_VENDAS] Coluna de corretor não encontrada. Headers:', headers);
    return {};
  }

  const mapa = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const corretor = String(row[colCorretor] || '').toUpperCase().trim();
    if (!corretor) continue;

    const statusRaw = colStatus !== null ? String(row[colStatus] || '') : '';
    // Se não tem coluna de status, tenta detectar o tipo em qualquer célula da linha
    const tipoDetectado = detectarTipo(statusRaw)
      || row.map(c => detectarTipo(c)).find(t => t !== null)
      || null;

    if (!tipoDetectado) continue;

    if (!mapa[corretor]) {
      mapa[corretor] = { proposta: 0, preVenda: 0, vendaSV: 0, detalhes: [] };
    }
    mapa[corretor][tipoDetectado]++;
    mapa[corretor].detalhes.push({
      tipo: tipoDetectado,
      cliente:  colCliente !== null ? row[colCliente] : '',
      data:     colData    !== null ? row[colData]    : '',
      vgv:      colVGV     !== null ? row[colVGV]     : '',
      linhaBruta: row.join(' | '),
    });
  }
  return mapa;
}

// Parseia PBI_CORRETORES — retorna mapa { corretor → diasSemVender }
function parsearCorretores(rows) {
  if (!rows || rows.length < 2) return {};
  const headers = rows[0].map(h => String(h || '').toUpperCase().trim());
  const colCorretor = acharColuna(headers, ['CORRETOR', 'VENDEDOR', 'NOME']);
  const colDias     = acharColuna(headers, ['DIAS', 'D/', 'SEM VENDER', 'DIAS SEM']);
  if (colCorretor === null) return {};

  const mapa = {};
  for (let i = 1; i < rows.length; i++) {
    const corretor = String(rows[i][colCorretor] || '').toUpperCase().trim();
    if (!corretor) continue;
    const dias = colDias !== null ? parseInt(rows[i][colDias]) || 0 : 0;
    mapa[corretor] = dias;
  }
  return mapa;
}

async function fetchCSV(gid) {
  const res = await fetch(csvUrl(gid));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const txt = await res.text();
  const { data } = Papa.parse(txt, { skipEmptyLines: true });
  return data;
}

export function useVendasExternas() {
  const [vendas, setVendas]         = useState(null);
  const [corretoresPBI, setCorretores] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [lastFetch, setLastFetch]   = useState(null);

  const fetchVendas = useCallback(async () => {
    // GIDs ainda não preenchidos
    if (GID.PBI_VENDAS === 'PREENCHER') {
      setError('GIDs das abas PBI ainda não configurados em src/config.js');
      return;
    }

    setLoading(true); setError(null);
    try {
      const [rowsVendas, rowsCor] = await Promise.all([
        fetchCSV(GID.PBI_VENDAS).catch(() => null),
        fetchCSV(GID.PBI_CORRETORES).catch(() => null),
      ]);

      const mapaVendas = parsearVendas(rowsVendas);
      const mapaCor    = parsearCorretores(rowsCor);

      if (Object.keys(mapaVendas).length === 0 && rowsVendas) {
        setError(
          `PBI_VENDAS tem ${rowsVendas.length} linhas mas nenhum corretor/tipo reconhecido. ` +
          `Cabeçalhos: ${rowsVendas[0]?.join(' | ')}`
        );
      }

      setVendas(mapaVendas);
      setCorretores(mapaCor);
      setLastFetch(new Date());
    } catch (e) {
      setError(`Erro ao ler abas PBI: ${e.message}`);
    }
    setLoading(false);
  }, []);

  return { vendas, corretoresPBI, loading, error, lastFetch, fetchVendas };
}

/**
 * Verifica rastreabilidade: venda no PBI sem Forms preenchidos
 */
export function verificarRastreabilidade(vendas, raw) {
  if (!vendas || !raw) return [];
  return Object.entries(vendas)
    .filter(([, d]) => d.proposta + d.preVenda + d.vendaSV > 0)
    .flatMap(([corretor, dados]) => {
      const temForm3 = raw.form3.some(r =>
        r.corretor === corretor &&
        (r.resultado.includes('PROPOSTA') || r.resultado.includes('PRÉ') ||
         r.resultado.includes('PRE') || r.resultado.includes('ASSINADA') ||
         r.resultado.includes('SV'))
      );
      const temForm2 = raw.form2.some(r => r.corretor === corretor);
      const temForm1 = raw.form1.some(r => r.corretor === corretor);

      if (temForm1 && temForm2 && temForm3) return [];

      const faltando = [];
      if (!temForm1) faltando.push('Registro Diário (Form 1)');
      if (!temForm2) faltando.push('Agendamento (Form 2)');
      if (!temForm3) faltando.push('Visita/Resultado (Form 3)');

      return [{
        corretor, nivel: 'vermelho', dados,
        msg: `${corretor}: ${dados.proposta + dados.preVenda + dados.vendaSV} venda(s) no CRM sem preenchimento — falta: ${faltando.join(', ')}`,
      }];
    });
}

/**
 * Parseia PBI_RESUMO — retorna { vgvTotal, recebimento, ultimaAtualizacao }
 */
function parsearResumo(rows) {
  if (!rows || rows.length < 2) return null;
  const result = { vgvTotal: 0, recebimento: 0, ultimaAtualizacao: '' };
  for (let i = 1; i < rows.length; i++) {
    const metrica = String(rows[i][0] || '').toUpperCase();
    const valor   = rows[i][1];
    if (metrica.includes('VGV'))          result.vgvTotal      = parseFloat(String(valor).replace(/[^0-9.,]/g,'').replace(',','.')) || 0;
    if (metrica.includes('RECEB'))        result.recebimento   = parseFloat(String(valor).replace(/[^0-9.,]/g,'').replace(',','.')) || 0;
    if (metrica.includes('ATUALIZA'))     result.ultimaAtualizacao = String(valor || '');
  }
  return result;
}

export function useResumoExterno() {
  const [resumo, setResumo]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchResumo = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const rows = await fetchCSV(GID.PBI_RESUMO);
      setResumo(parsearResumo(rows));
      setLastFetch(new Date());
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  return { resumo, loading, error, lastFetch, fetchResumo };
}
