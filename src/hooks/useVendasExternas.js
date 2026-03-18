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

/**
 * Parseia PBI_CORRETORES — colunas confirmadas no screenshot da P6:
 * FAIXA DE DIAS | APELIDO | ENTRADA | SITUAÇÃO | FUNÇÃO | GERENTE | SUPERINT. | DIRETOR | DATA ÚLTIMA VENDA | DIAS S/ VENDER
 *
 * Formato de cada linha no Sheets (GAS separou por " | "):
 * "+100 dias | DIANA | 09/01/2025 | ATIVO | CONSULTOR DE VENDAS 2.0 | SCOTT | BETEL | LISBOA | 31/05/2025 | 291"
 *
 * Retorna mapa { NOME → { diasSemVender, dataEntrada, dataUltimaVenda, cargo, gerente, super_ } }
 */
function parsearCorretores(rows) {
  if (!rows || rows.length < 2) return {};
  const mapa = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Identifica a linha bruta — col C quando col B = "P6_CORRETOR" (formato GAS)
    let linhaBruta = '';
    const colB = String(row[1] || '');
    if (colB === 'P6_CORRETOR' || colB.includes('P6')) {
      linhaBruta = String(row[2] || '');
    } else {
      // Fallback: tenta montar a linha de todas as colunas
      linhaBruta = row.map(c => String(c || '').trim()).filter(Boolean).join(' | ');
    }

    if (!linhaBruta || linhaBruta.length < 5) continue;

    // Remove prefixos do Power BI
    linhaBruta = linhaBruta
      .replace(/Row Selection \| /g, '')
      .replace(/Select Row \| /g, '')
      .trim();

    const p = linhaBruta.split(' | ').map(x => x.trim()).filter(Boolean);
    if (p.length < 2) continue;

    // Índices confirmados pelo screenshot:
    // [0] FAIXA DE DIAS  ex: "+100 dias"
    // [1] APELIDO        ex: "DIANA"
    // [2] ENTRADA        ex: "09/01/2025"
    // [3] SITUAÇÃO       ex: "ATIVO"
    // [4] FUNÇÃO         ex: "CONSULTOR DE VENDAS 2.0"
    // [5] GERENTE        ex: "SCOTT"
    // [6] SUPERINT.      ex: "BETEL"
    // [7] DIRETOR        ex: "LISBOA"
    // [8] DATA ÚLTIMA VENDA  ex: "31/05/2025"
    // [9] DIAS S/ VENDER ex: "291"

    const diasMatch = p[0].match(/\d+/);
    const diasSemVender = diasMatch ? parseInt(diasMatch[0]) : 0;

    const nome = p[1]?.toUpperCase().trim();
    if (!nome || nome.length < 2 || nome === 'APELIDO') continue; // pula cabeçalho

    const dataEntrada     = p[2] || '';
    const cargo           = p[4] || '';
    const gerente         = p[5] || '';
    const super_          = p[6] || '';
    const dataUltimaVenda = p[8] || '';
    // Dias numérico pode vir na col [9] diretamente
    const diasNumericos   = p[9] ? (parseInt(p[9]) || diasSemVender) : diasSemVender;

    mapa[nome] = {
      diasSemVender: diasNumericos,
      dataEntrada,
      dataUltimaVenda,
      cargo,
      gerente,
      super_,
    };
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
 * Converte string de número para float — suporta formatos:
 *   "16.210.000,00"  → 16210000   (BR com ponto milhar, vírgula decimal)
 *   "16,210,000.00"  → 16210000   (US com vírgula milhar, ponto decimal)
 *   "16210000"       → 16210000   (sem separadores)
 *   "R$ 16.210.000,00" → 16210000 (com prefixo monetário)
 */
function parsearNumero(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  // Remove tudo que não é dígito, vírgula ou ponto
  s = s.replace(/[^0-9.,]/g, '');
  if (!s) return 0;

  const temVirgula = s.includes(',');
  const temPonto   = s.includes('.');

  if (temVirgula && temPonto) {
    // Descobre qual é o separador decimal (o último da string)
    const ultVirgula = s.lastIndexOf(',');
    const ultPonto   = s.lastIndexOf('.');
    if (ultVirgula > ultPonto) {
      // BR: 16.210.000,00 — ponto é milhar, vírgula é decimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 16,210,000.00 — vírgula é milhar, ponto é decimal
      s = s.replace(/,/g, '');
    }
  } else if (temVirgula && !temPonto) {
    // Só vírgula: assume decimal BR (ex: "16000,50")
    s = s.replace(',', '.');
  }
  // Só ponto ou sem separador: deixa como está

  return parseFloat(s) || 0;
}

/**
 * Parseia PBI_RESUMO — retorna { vgvTotal, recebimento, ultimaAtualizacao }
 */
function parsearResumo(rows) {
  if (!rows || rows.length < 2) return null;
  const result = { vgvTotal: 0, recebimento: 0, ultimaAtualizacao: '' };
  for (let i = 0; i < rows.length; i++) {
    const metrica = String(rows[i][0] || '').toUpperCase();
    const valor   = rows[i][1];
    if (metrica.includes('VGV'))      result.vgvTotal           = parsearNumero(valor);
    if (metrica.includes('RECEB'))    result.recebimento        = parsearNumero(valor);
    if (metrica.includes('ATUALIZA')) result.ultimaAtualizacao  = String(valor || '');
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
