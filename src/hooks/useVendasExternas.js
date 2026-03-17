/**
 * useVendasExternas — lê o HTML da dashboard Power BI da empresa,
 * parseia corretores + tipo de venda (Proposta / Pré-venda / Venda SV).
 * 
 * Roda no navegador do usuário (sem restrição de rede).
 * Tenta múltiplos padrões de HTML para ser robusto.
 */
import { useState, useCallback } from 'react';

const URL_DASH = 'https://construtora-metrocasa.github.io/central/lisboa/Diretoria-Garra-385.html';

// Tipos de venda — ordem de conversão
export const TIPOS_VENDA = ['proposta', 'preVenda', 'vendaSV'];
export const LABEL_VENDA = {
  proposta:  'Proposta Assinada',
  preVenda:  'Pré-Venda',
  vendaSV:   'Venda SV',
};

// Tenta extrair vendas do HTML parseado
function parsearHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const vendas = []; // { corretor, tipo, cliente? }

  // Estratégia 1: tabelas com cabeçalho reconhecível
  const tables = doc.querySelectorAll('table');
  tables.forEach(table => {
    const headers = [...table.querySelectorAll('th,thead td')]
      .map(h => h.textContent.trim().toLowerCase());
    
    const colCorretor = headers.findIndex(h =>
      h.includes('corretor') || h.includes('vendedor') || h.includes('corretor'));
    const colTipo = headers.findIndex(h =>
      h.includes('tipo') || h.includes('status') || h.includes('etapa') || h.includes('fase'));
    const colCliente = headers.findIndex(h =>
      h.includes('cliente') || h.includes('comprador'));

    if (colCorretor === -1) return;

    const rows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length <= colCorretor) return;
      const corretor = cells[colCorretor]?.textContent?.trim().toUpperCase();
      const tipoRaw  = cells[colTipo >= 0 ? colTipo : 0]?.textContent?.trim().toUpperCase() || '';
      const cliente  = cells[colCliente >= 0 ? colCliente : -1]?.textContent?.trim() || '';
      if (!corretor) return;
      vendas.push({ corretor, tipo: detectarTipo(tipoRaw), tipoRaw, cliente });
    });
  });

  // Estratégia 2: busca por texto nas células se tabelas não funcionaram
  if (vendas.length === 0) {
    const allCells = doc.querySelectorAll('td, .cell, .row, [data-corretor], [data-vendedor]');
    // Busca padrão: texto "NOME_CORRETOR — Proposta Assinada"
    const textContent = doc.body?.textContent || '';
    const linhas = textContent.split('\n').map(l => l.trim()).filter(Boolean);
    
    linhas.forEach(linha => {
      const tipo = detectarTipo(linha);
      if (tipo === 'desconhecido') return;
      // Tenta extrair nome do corretor da linha
      const partes = linha.split(/[-–—|:,]/);
      const nome = partes[0]?.trim().toUpperCase();
      if (nome && nome.length > 2 && nome.length < 40) {
        vendas.push({ corretor: nome, tipo, tipoRaw: linha, cliente: '' });
      }
    });
  }

  return vendas;
}

function detectarTipo(texto) {
  const t = String(texto).toUpperCase();
  if (t.includes('VENDA SV') || t.includes('VENDA_SV') || t.includes('SV')) return 'vendaSV';
  if (t.includes('PRÉ') || t.includes('PRE') || t.includes('PRE-VENDA') || t.includes('PRÉ-VENDA')) return 'preVenda';
  if (t.includes('PROPOSTA') || t.includes('ASSINADA') || t.includes('INTEN')) return 'proposta';
  return 'desconhecido';
}

// Agrupa vendas por corretor
function agruparPorCorretor(vendas) {
  const mapa = {};
  vendas.forEach(v => {
    if (!mapa[v.corretor]) mapa[v.corretor] = { proposta:0, preVenda:0, vendaSV:0, detalhes:[] };
    if (v.tipo !== 'desconhecido') {
      mapa[v.corretor][v.tipo]++;
      mapa[v.corretor].detalhes.push(v);
    }
  });
  return mapa;
}

export function useVendasExternas() {
  const [vendas, setVendas]     = useState(null);  // mapa por corretor
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [rawVendas, setRaw]     = useState([]);     // lista bruta para debug
  const [lastFetch, setLastFetch] = useState(null);

  const fetchVendas = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(URL_DASH, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const lista = parsearHTML(html);
      const mapa  = agruparPorCorretor(lista.filter(v => v.tipo !== 'desconhecido'));
      setRaw(lista);
      setVendas(mapa);
      setLastFetch(new Date());
    } catch(e) {
      setError(`Não foi possível acessar a dashboard da empresa: ${e.message}`);
    }
    setLoading(false);
  }, []);

  return { vendas, loading, error, rawVendas, lastFetch, fetchVendas };
}

/**
 * Verifica rastreabilidade de uma venda externa:
 * para cada venda no Power BI, existe Form1 + Form2 + Form3 preenchido?
 */
export function verificarRastreabilidade(vendas, raw) {
  if (!vendas || !raw) return [];
  const alertas = [];

  Object.entries(vendas).forEach(([corretor, dados]) => {
    // Verifica se tem Form3 com resultado compatível
    const temForm3 = raw.form3.some(r =>
      r.corretor === corretor &&
      (r.resultado.includes('PROPOSTA') || r.resultado.includes('PRÉ') ||
       r.resultado.includes('PRE') || r.resultado.includes('ASSINADA') ||
       r.resultado.includes('SV'))
    );

    const temForm2 = raw.form2.some(r => r.corretor === corretor);
    const temForm1 = raw.form1.some(r => r.corretor === corretor);

    const totalVendas = dados.proposta + dados.preVenda + dados.vendaSV;
    if (totalVendas === 0) return;

    if (!temForm1 || !temForm2 || !temForm3) {
      const faltando = [];
      if (!temForm1) faltando.push('Registro Diário');
      if (!temForm2) faltando.push('Agendamentos');
      if (!temForm3) faltando.push('Visitas/Resultado');
      alertas.push({
        corretor, nivel: 'vermelho',
        msg: `${corretor}: ${totalVendas} venda(s) no sistema sem preenchimento completo — falta: ${faltando.join(', ')}`,
        dados,
      });
    }
  });

  return alertas;
}
