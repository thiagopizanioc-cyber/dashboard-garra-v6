import { useState, useRef } from 'react';
import { fmt, topCanais } from '../utils/index';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

async function gerarAnaliseIA(corretor, media) {
  const engaj = corretor.diasTrabalhados > 0
    ? ((corretor.antes20h + corretor.ate00h) / corretor.diasTrabalhados * 100).toFixed(0)
    : 0;
  const topAg = topCanais(corretor.canaisAg, 3).map(([c, v]) => `${c} (${(v*100).toFixed(0)}%)`).join(', ') || 'N/D';

  const prompt = `Você é um Coach de Performance de Vendas Imobiliárias. Analise os dados do corretor e forneça um diagnóstico executivo em português brasileiro.

DADOS DO CORRETOR: ${corretor.corretor}
Período: ${corretor.dataInicio} a ${corretor.dataFim} (${corretor.periodo} dias)
Superintendência: ${corretor.superintendente} | Gerente: ${corretor.gerente}

DISCIPLINA:
- Dias trabalhados: ${corretor.diasTrabalhados} | Folgas: ${corretor.folgas}
- Preencheu antes 20h: ${corretor.antes20h} | Até 00h: ${corretor.ate00h} | Retroativo: ${corretor.retroativo}
- Engajamento: ${engaj}% | Streak: ${corretor.streak} dias

ATIVIDADE:
- Leads novos: ${corretor.leads} (Média do time: ${fmt.num(media.leads,1)})
- Repiks: ${corretor.repiks} | Discador: ${corretor.tempoDiscador} min

FUNIL:
- Agendamentos: ${corretor.agendForm2} (Form1 declarou: ${corretor.agendForm1})
- Visitas: ${corretor.visitasForm3} | Pré-Vendas: ${corretor.preVendas}
- Propostas: ${corretor.propostas}
- Taxa Lead→Agend: ${fmt.pct(corretor.taxaLeadAgend)} (Média: ${fmt.pct(media.taxaLeadAgend)})
- Taxa Agend→Visita: ${fmt.pct(corretor.taxaAgendVisita)} (Média: ${fmt.pct(media.taxaAgendVisita)})
- Taxa Conversão: ${fmt.pct(corretor.taxaVisitaConv)} (Média: ${fmt.pct(media.taxaVisitaConv)})
- No-Show: ${fmt.pct(corretor.noShow)}

CANAIS: Top agendamentos: ${topAg}
SICAQ: ${corretor.sicaqQtd} aprovados (${fmt.pct(corretor.sicaqPerc)} sobre agendamentos)
GERENTE NA VISITA: ${corretor.visitasComGerente} visitas (${fmt.pct(corretor.taxaPartGerente)})

Responda SOMENTE no formato JSON abaixo (sem markdown, sem explicações fora do JSON):
{
  "disciplina": "análise de 2-3 frases sobre disciplina, rotina e engajamento",
  "atividade": "análise de 2-3 frases sobre volume de atividade, leads e canais",
  "funil": "análise de 2-3 frases sobre o funil, gargalos e taxas de conversão",
  "qualidade": "análise de 2-3 frases sobre qualidade, SICAQ, participação do gerente",
  "resumo": "parágrafo executivo de 3-4 frases resumindo o desempenho geral",
  "pauta": ["pergunta 1 para reunião com gerente", "pergunta 2", "pergunta 3", "pergunta 4"]
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export function RelatorioModal({ corretor, media, onClose }) {
  const [analise, setAnalise] = useState(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [erroIA, setErroIA] = useState(null);
  const printRef = useRef();

  const engaj = corretor.diasTrabalhados > 0
    ? ((corretor.antes20h + corretor.ate00h) / corretor.diasTrabalhados * 100).toFixed(0)
    : 0;

  async function handleGerarIA() {
    if (!GEMINI_KEY) {
      setErroIA('Configure VITE_GEMINI_API_KEY nas variáveis de ambiente da Vercel.');
      return;
    }
    setLoadingIA(true); setErroIA(null);
    try {
      const result = await gerarAnaliseIA(corretor, media);
      setAnalise(result);
    } catch (e) {
      setErroIA('Erro ao gerar análise: ' + e.message);
    }
    setLoadingIA(false);
  }

  function handlePrint() {
    const win = window.open('', '_blank');
    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>Raio-X ${corretor.corretor}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20px; }
        h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
        .sub { text-align: center; color: #555; margin-bottom: 16px; font-size: 11px; }
        .kpis { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .kpi { background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; min-width: 80px; text-align: center; }
        .kpi-val { font-size: 20px; font-weight: bold; color: #111; }
        .kpi-lbl { font-size: 9px; color: #777; text-transform: uppercase; margin-top: 2px; }
        .section { margin-bottom: 14px; }
        .section-title { font-size: 13px; font-weight: bold; border-bottom: 2px solid #222; padding-bottom: 3px; margin-bottom: 8px; }
        .ai-block { background: #f9f9f9; border-left: 4px solid #c8a200; padding: 8px 12px; margin-bottom: 8px; border-radius: 0 6px 6px 0; }
        .ai-block-title { font-weight: bold; font-size: 11px; color: #c8a200; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #222; color: #fff; padding: 5px 8px; text-align: left; }
        td { padding: 4px 8px; border-bottom: 1px solid #eee; }
        .resumo { background: #fffbe6; border: 1px solid #f0d060; padding: 10px; border-radius: 6px; margin-bottom: 12px; font-size: 12px; }
        ul { padding-left: 16px; }
        ul li { margin-bottom: 3px; }
      </style></head><body>
      ${printRef.current?.innerHTML || ''}
    </body></html>`;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  const stats = [
    { val: corretor.diasTrabalhados, lbl: 'Dias Trab.' },
    { val: corretor.streak,          lbl: 'Streak' },
    { val: corretor.leads,           lbl: 'Leads' },
    { val: corretor.agendForm2,      lbl: 'Agendas' },
    { val: corretor.visitasForm3,    lbl: 'Visitas' },
    { val: fmt.pct(corretor.sicaqPerc), lbl: 'SICAQ %' },
    { val: fmt.pct(corretor.noShow), lbl: 'No-Show' },
    { val: corretor.propostas,       lbl: 'Propostas' },
    { val: corretor.preVendas,       lbl: 'Vendas' },
    { val: corretor.visitasComGerente, lbl: 'Mesa c/Ger' },
    { val: corretor.repiks,          lbl: 'Repiks' },
    { val: `${engaj}%`,              lbl: 'Compliance' },
  ];

  return (
    <div className="relatorio-overlay" onClick={onClose}>
      <div className="relatorio-box" onClick={e => e.stopPropagation()}>

        {/* Toolbar */}
        <div className="relatorio-toolbar">
          <div className="relatorio-toolbar-title">
            📄 Raio-X de Performance — <span translate="no">{corretor.corretor}</span>
          </div>
          <div className="relatorio-toolbar-btns">
            {!analise && !loadingIA && (
              <button className="btn-ia" onClick={handleGerarIA}>
                🤖 Gerar Análise IA
              </button>
            )}
            {loadingIA && <span className="ia-loading">⏳ Gerando análise...</span>}
            <button className="btn-print" onClick={handlePrint}>🖨️ Imprimir</button>
            <button className="relatorio-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {erroIA && <div className="ia-erro">{erroIA}</div>}

        {/* Conteúdo imprimível */}
        <div ref={printRef} className="relatorio-content">

          <div className="rel-header">
            <img src="/logo-ouro.jpeg" alt="GARRA" className="rel-logo"/>
            <div>
              <h1 className="rel-title">RAIO-X DE PERFORMANCE</h1>
              <div className="rel-sub" translate="no">
                Corretor: <strong>{corretor.corretor}</strong> &nbsp;|&nbsp;
                Período: {corretor.dataInicio} a {corretor.dataFim}
              </div>
              <div className="rel-sub" translate="no">
                {corretor.gerente} · {corretor.superintendente}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="rel-kpis">
            {stats.map(s => (
              <div key={s.lbl} className="rel-kpi">
                <div className="rel-kpi-val">{s.val}</div>
                <div className="rel-kpi-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Análise IA */}
          {analise && (
            <div className="rel-section">
              <div className="rel-section-title">🧠 Análise de Direção (Claude AI)</div>

              {analise.resumo && (
                <div className="rel-resumo">{analise.resumo}</div>
              )}

              <div className="rel-ai-grid">
                {[
                  { icon:'🎯', key:'disciplina',  title:'Disciplina & Rotina' },
                  { icon:'🔥', key:'atividade',   title:'Atividade & Canais' },
                  { icon:'📉', key:'funil',       title:'Funil de Vendas' },
                  { icon:'💎', key:'qualidade',   title:'Qualidade (SICAQ)' },
                ].map(item => (
                  <div key={item.key} className="rel-ai-block">
                    <div className="rel-ai-title">{item.icon} {item.title}</div>
                    <p>{analise[item.key]}</p>
                  </div>
                ))}
              </div>

              {analise.pauta?.length > 0 && (
                <div className="rel-pauta">
                  <div className="rel-ai-title">💬 Pauta de Reunião com Gerente</div>
                  <ul>
                    {analise.pauta.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!analise && (
            <div className="rel-ia-placeholder">
              <span>🤖 Clique em "Gerar Análise IA" para adicionar o diagnóstico inteligente ao relatório</span>
            </div>
          )}

          {/* Funil */}
          <div className="rel-section">
            <div className="rel-section-title">📊 Funil de Performance</div>
            <table className="rel-table">
              <thead><tr>
                <th>Métrica</th><th>Corretor</th><th>Média do Time</th><th>Comparação</th>
              </tr></thead>
              <tbody>
                {[
                  { l:'Leads',            c:corretor.leads,           m:media.leads,           pct:false },
                  { l:'Agendamentos',      c:corretor.agendForm2,      m:media.agendForm2,      pct:false },
                  { l:'Visitas',           c:corretor.visitasForm3,    m:media.visitasForm3,    pct:false },
                  { l:'Pré-Vendas',        c:corretor.preVendas,       m:media.preVendas,       pct:false },
                  { l:'Taxa Lead→Agend',   c:corretor.taxaLeadAgend,   m:media.taxaLeadAgend,   pct:true },
                  { l:'Taxa Agend→Visita', c:corretor.taxaAgendVisita, m:media.taxaAgendVisita, pct:true },
                  { l:'Taxa Conversão',    c:corretor.taxaVisitaConv,  m:media.taxaVisitaConv,  pct:true },
                  { l:'No-Show',           c:corretor.noShow,          m:media.noShow,          pct:true, inv:true },
                ].map(row => {
                  const cv = row.pct ? fmt.pct(row.c) : fmt.int(row.c);
                  const mv = row.pct ? fmt.pct(row.m) : fmt.num(row.m,1);
                  const melhor = row.inv ? row.c <= row.m : row.c >= row.m;
                  return (
                    <tr key={row.l}>
                      <td>{row.l}</td>
                      <td style={{fontWeight:600}}>{cv}</td>
                      <td style={{color:'#888'}}>{mv}</td>
                      <td>{melhor ? '🟢 Acima' : '🔴 Abaixo'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Canais */}
          {topCanais(corretor.canaisAg).length > 0 && (
            <div className="rel-section">
              <div className="rel-section-title">📡 Top Canais de Agendamento</div>
              <table className="rel-table">
                <thead><tr><th>Canal</th><th>% do Total</th></tr></thead>
                <tbody>
                  {topCanais(corretor.canaisAg, 5).map(([canal, v]) => (
                    <tr key={canal}>
                      <td>{canal}</td>
                      <td>{fmt.pct(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rel-footer">
            Gerado em {new Date().toLocaleString('pt-BR')} · Sistema GARRA
          </div>
        </div>
      </div>
    </div>
  );
}
