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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    }
  );

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export function RelatorioModal({ corretor, media, onClose, getPhoto }) {
  const [analise, setAnalise] = useState(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [erroIA, setErroIA] = useState(null);
  const printRef = useRef();
  const photo = getPhoto ? getPhoto(corretor.corretor) : null;

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 28px 32px; max-width: 900px; margin: 0 auto; }

        /* ── CABEÇALHO ── */
        .rel-header { display: flex; align-items: center; gap: 18px; border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 20px; }
        .rel-header-avatar { width: 72px; height: 72px; border-radius: 50%; overflow: hidden; border: 3px solid #c8a200; flex-shrink: 0; }
        .rel-header-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .rel-logo { width: 100%; height: 100%; object-fit: cover; }
        .rel-title { font-size: 22px; font-weight: 800; letter-spacing: .04em; color: #1a1a1a; margin-bottom: 4px; }
        .rel-sub { font-size: 11px; color: #555; margin-top: 2px; }
        .rel-sub strong { color: #1a1a1a; }

        /* ── KPIs ── */
        .rel-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 20px; }
        .rel-kpi { background: #f8f8f8; border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 8px; text-align: center; }
        .rel-kpi-val { font-size: 22px; font-weight: 700; color: #1a1a1a; line-height: 1.1; }
        .rel-kpi-lbl { font-size: 8.5px; color: #888; text-transform: uppercase; letter-spacing: .06em; margin-top: 3px; }

        /* ── RESUMO IA ── */
        .rel-resumo { background: #fffbea; border: 1.5px solid #e8c840; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12.5px; line-height: 1.6; color: #3a2e00; }

        /* ── GRID IA ── */
        .rel-ai-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
        .rel-ai-block { background: #fafafa; border: 1px solid #eee; border-left: 4px solid #c8a200; border-radius: 0 8px 8px 0; padding: 10px 12px; }
        .rel-ai-title { font-size: 10px; font-weight: 700; color: #c8a200; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; }
        .rel-ai-block p { font-size: 11.5px; line-height: 1.55; color: #333; }

        /* ── PAUTA ── */
        .rel-pauta { background: #f0f7ff; border: 1px solid #cce0ff; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
        .rel-pauta .rel-ai-title { color: #2563eb; }
        .rel-pauta ul { padding-left: 18px; }
        .rel-pauta ul li { font-size: 11.5px; line-height: 1.55; color: #1e3a6e; margin-bottom: 4px; }

        /* ── SEÇÕES ── */
        .rel-section { margin-bottom: 16px; }
        .rel-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px; margin-bottom: 10px; }

        /* ── TABELA ── */
        .rel-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .rel-table th { background: #1a1a1a; color: #fff; padding: 6px 10px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
        .rel-table td { padding: 5px 10px; border-bottom: 1px solid #f0f0f0; color: #333; }
        .rel-table tr:nth-child(even) td { background: #fafafa; }

        /* ── RODAPÉ ── */
        .rel-footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }

        /* ── IA PLACEHOLDER ── */
        .rel-ia-placeholder { display: none; }

        @media print {
          body { padding: 16px 20px; }
          .rel-kpis { grid-template-columns: repeat(6, 1fr); }
          .rel-ai-grid { grid-template-columns: 1fr 1fr; }
        }
      </style></head><body>
      ${printRef.current?.innerHTML || ''}
    </body></html>`;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 800);
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
            <div className="rel-header-avatar">
              {photo
                ? <img src={photo} alt={corretor.corretor} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                : <img src="/logo-ouro.jpeg" alt="GARRA" className="rel-logo"/>}
            </div>
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
