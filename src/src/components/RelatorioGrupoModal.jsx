import { useState, useRef } from 'react';
import { fmt, consolidar, topCanais } from '../utils/index';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

async function gerarAnaliseGrupoIA(tipo, nome, cons, lista) {
  const engajMedio = lista.filter(c=>c.diasTrabalhados>0).length > 0
    ? (lista.filter(c=>c.diasTrabalhados>0)
        .reduce((s,c)=>s+(c.antes20h+c.ate00h)/c.diasTrabalhados,0)
      / lista.filter(c=>c.diasTrabalhados>0).length * 100).toFixed(0)
    : 0;

  const semDados = lista.filter(c=>c.diasTrabalhados===0).map(c=>c.corretor);
  const topPerf  = [...lista].sort((a,b)=>b.preVendas-a.preVendas).slice(0,3).map(c=>c.corretor);

  const prompt = `Você é um Coach de Vendas Imobiliárias. Analise o desempenho da ${tipo} e forneça diagnóstico executivo em português.

${tipo.toUpperCase()}: ${nome}
Período: ${lista[0]?.dataInicio||''} a ${lista[0]?.dataFim||''}

EQUIPE:
- Total: ${cons.total} corretores | Ativos: ${cons.ativos}
${semDados.length>0?`- Sem registro: ${semDados.join(', ')}`:'- Todos com registro ✅'}
- Engajamento médio: ${engajMedio}%

RESULTADO:
- Leads: ${cons.leads} | Agendamentos: ${cons.agend} | Visitas: ${cons.visitas} | Pré-Vendas: ${cons.preVendas}
- Taxa Lead→Agend: ${fmt.pct(cons.txLeadAgend)} | Taxa Conv.: ${fmt.pct(cons.txConv)}
- Top performers: ${topPerf.join(', ')||'N/D'}

Responda SOMENTE no JSON (sem markdown):
{
  "visao_geral": "2-3 frases sobre o panorama geral da equipe",
  "disciplina": "análise sobre engajamento, preenchimento e ausências",
  "performance": "análise do funil, conversão e eficiência da equipe",
  "destaques": "quem está performando bem e por quê",
  "riscos": "pontos críticos que precisam de atenção imediata",
  "resumo": "parágrafo executivo de 3 frases para apresentação",
  "pauta": ["ação 1 prioritária", "ação 2", "ação 3", "ação 4"]
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    }
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

export function RelatorioGrupoModal({ tipo, nome, lista, onClose, getPhoto }) {
  const [analise, setAnalise]     = useState(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [erroIA, setErroIA]       = useState(null);
  const printRef = useRef();

  const cons = consolidar(lista);
  const photo = getPhoto ? getPhoto(nome) : null;
  const ativos = lista.filter(c => c.diasTrabalhados > 0);
  const semDados = lista.filter(c => c.diasTrabalhados === 0);
  const engaj = ativos.length
    ? ativos.reduce((s,c)=>s+(c.antes20h+c.ate00h)/c.diasTrabalhados,0)/ativos.length : 0;
  const topPerf = [...lista].sort((a,b)=>b.preVendas-a.preVendas).slice(0,5);
  const periodo = lista[0] ? `${lista[0].dataInicio} a ${lista[0].dataFim}` : '';

  async function handleGerarIA() {
    if (!GEMINI_KEY) { setErroIA('Configure VITE_GEMINI_API_KEY na Vercel.'); return; }
    setLoadingIA(true); setErroIA(null);
    try { setAnalise(await gerarAnaliseGrupoIA(tipo, nome, cons, lista)); }
    catch(e) { setErroIA('Erro: ' + e.message); }
    setLoadingIA(false);
  }

  function handlePrint() {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
      <title>Relatório ${tipo} ${nome}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;padding:28px 32px;max-width:900px;margin:0 auto;}
        .rel-header{display:flex;align-items:center;gap:18px;border-bottom:3px solid #1a1a1a;padding-bottom:16px;margin-bottom:20px;}
        .rel-header-avatar{width:72px;height:72px;border-radius:50%;overflow:hidden;border:3px solid #c8a200;flex-shrink:0;}
        .rel-header-avatar img{width:100%;height:100%;object-fit:cover;}
        .rel-logo{width:100%;height:100%;object-fit:cover;}
        .rel-title{font-size:22px;font-weight:800;letter-spacing:.04em;color:#1a1a1a;margin-bottom:4px;}
        .rel-sub{font-size:11px;color:#555;margin-top:2px;}
        .rel-sub strong{color:#1a1a1a;}
        .rel-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px;}
        .rel-kpi{background:#f8f8f8;border:1px solid #e5e5e5;border-radius:8px;padding:10px 8px;text-align:center;}
        .rel-kpi-val{font-size:20px;font-weight:700;color:#1a1a1a;line-height:1.1;}
        .rel-kpi-lbl{font-size:8.5px;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-top:3px;}
        .rel-resumo{background:#fffbea;border:1.5px solid #e8c840;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:12.5px;line-height:1.6;color:#3a2e00;}
        .rel-ai-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
        .rel-ai-block{background:#fafafa;border:1px solid #eee;border-left:4px solid #c8a200;border-radius:0 8px 8px 0;padding:10px 12px;}
        .rel-ai-title{font-size:10px;font-weight:700;color:#c8a200;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;}
        .rel-ai-block p{font-size:11.5px;line-height:1.55;color:#333;}
        .rel-pauta{background:#f0f7ff;border:1px solid #cce0ff;border-radius:8px;padding:12px 16px;margin-bottom:16px;}
        .rel-pauta .rel-ai-title{color:#2563eb;}
        .rel-pauta ul{padding-left:18px;}
        .rel-pauta ul li{font-size:11.5px;line-height:1.55;color:#1e3a6e;margin-bottom:4px;}
        .rel-section{margin-bottom:16px;}
        .rel-section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#1a1a1a;border-bottom:2px solid #1a1a1a;padding-bottom:5px;margin-bottom:10px;}
        .rel-table{width:100%;border-collapse:collapse;font-size:11px;}
        .rel-table th{background:#1a1a1a;color:#fff;padding:6px 10px;text-align:left;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.04em;}
        .rel-table td{padding:5px 10px;border-bottom:1px solid #f0f0f0;color:#333;}
        .rel-table tr:nth-child(even) td{background:#fafafa;}
        .rel-footer{margin-top:24px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#999;text-align:center;}
        .rel-ia-placeholder{display:none;}
        @media print{body{padding:16px 20px;}}
      </style></head><body>${printRef.current?.innerHTML||''}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 800);
  }

  const kpis = [
    {val:`${cons.ativos}/${cons.total}`, lbl:'Corretores'},
    {val:cons.leads,    lbl:'Leads'},
    {val:cons.agend,    lbl:'Agendamentos'},
    {val:cons.visitas,  lbl:'Visitas'},
    {val:cons.preVendas,lbl:'Pré-Vendas'},
    {val:fmt.pct(cons.txLeadAgend),  lbl:'Tx L→Ag'},
    {val:fmt.pct(cons.txAgendVisita),lbl:'Tx Ag→Vis'},
    {val:fmt.pct(cons.txConv),       lbl:'Conversão'},
    {val:`${Math.round(engaj*100)}%`,lbl:'Engajamento'},
    {val:semDados.length,            lbl:'Sem Dados'},
  ];

  return (
    <div className="relatorio-overlay" onClick={onClose}>
      <div className="relatorio-box" onClick={e=>e.stopPropagation()}>

        <div className="relatorio-toolbar">
          <div className="relatorio-toolbar-title">
            📊 Relatório {tipo} — <span translate="no">{nome}</span>
          </div>
          <div className="relatorio-toolbar-btns">
            {!analise && !loadingIA && (
              <button className="btn-ia" onClick={handleGerarIA}>🤖 Gerar Análise IA</button>
            )}
            {loadingIA && <span className="ia-loading">⏳ Analisando equipe...</span>}
            <button className="btn-print" onClick={handlePrint}>🖨️ Imprimir</button>
            <button className="relatorio-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {erroIA && <div className="ia-erro">{erroIA}</div>}

        <div ref={printRef} className="relatorio-content">

          {/* Header */}
          <div className="rel-header">
            <div className="rel-header-avatar">
              {photo
                ? <img src={photo} alt={nome} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                : <img src="/logo-ouro.jpeg" alt="GARRA" className="rel-logo"/>}
            </div>
            <div>
              <h1 className="rel-title">RELATÓRIO DE {tipo.toUpperCase()}</h1>
              <div className="rel-sub" translate="no"><strong>{nome}</strong> · Período: {periodo}</div>
              <div className="rel-sub">{cons.ativos} ativos / {cons.total} total</div>
            </div>
          </div>

          {/* KPIs */}
          <div className="rel-kpis">
            {kpis.map(k => (
              <div key={k.lbl} className="rel-kpi">
                <div className="rel-kpi-val">{k.val}</div>
                <div className="rel-kpi-lbl">{k.lbl}</div>
              </div>
            ))}
          </div>

          {/* Análise IA */}
          {analise && (
            <div className="rel-section">
              <div className="rel-section-title">🧠 Análise de Direção (Gemini AI)</div>
              {analise.resumo && <div className="rel-resumo">{analise.resumo}</div>}
              <div className="rel-ai-grid">
                {[
                  {icon:'🌐',key:'visao_geral',title:'Visão Geral'},
                  {icon:'⏰',key:'disciplina', title:'Disciplina'},
                  {icon:'📊',key:'performance',title:'Performance'},
                  {icon:'⭐',key:'destaques',  title:'Destaques'},
                  {icon:'⚠️',key:'riscos',     title:'Riscos'},
                ].map(item=>(
                  <div key={item.key} className="rel-ai-block">
                    <div className="rel-ai-title">{item.icon} {item.title}</div>
                    <p>{analise[item.key]}</p>
                  </div>
                ))}
              </div>
              {analise.pauta?.length > 0 && (
                <div className="rel-pauta">
                  <div className="rel-ai-title">🎯 Ações Prioritárias</div>
                  <ul>{analise.pauta.map((p,i)=><li key={i}>{p}</li>)}</ul>
                </div>
              )}
            </div>
          )}
          {!analise && <div className="rel-ia-placeholder">🤖 Clique em "Gerar Análise IA" para diagnóstico da equipe</div>}

          {/* Top Performers */}
          <div className="rel-section">
            <div className="rel-section-title">🏆 Top Performers</div>
            <table className="rel-table">
              <thead><tr>
                <th>#</th><th>Corretor</th><th>Leads</th>
                <th>Agend.</th><th>Visitas</th><th>Pré-Venda</th><th>Conv.</th><th>Engaj.</th>
              </tr></thead>
              <tbody>
                {topPerf.map((c,i)=>{
                  const engajC = c.diasTrabalhados>0 ? (c.antes20h+c.ate00h)/c.diasTrabalhados : 0;
                  return (
                    <tr key={c.corretor}>
                      <td>{i+1}º</td>
                      <td style={{fontWeight:600}} translate="no">{c.corretor}</td>
                      <td>{c.leads}</td><td>{c.agendForm2}</td><td>{c.visitasForm3}</td>
                      <td style={{color:'#c8a200',fontWeight:700}}>{c.preVendas}</td>
                      <td>{fmt.pct(c.taxaVisitaConv)}</td>
                      <td>{fmt.pct(engajC)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sem dados */}
          {semDados.length > 0 && (
            <div className="rel-section">
              <div className="rel-section-title">⚠️ Corretores Sem Registro</div>
              <div style={{fontSize:12,color:'#888'}} translate="no">{semDados.map(c=>c.corretor).join(' · ')}</div>
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
