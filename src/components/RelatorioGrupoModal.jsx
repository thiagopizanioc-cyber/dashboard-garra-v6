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
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px;}
        h1{font-size:18px;margin-bottom:4px;}
        .sub{color:#555;margin-bottom:16px;font-size:11px;}
        .kpis{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}
        .kpi{background:#f5f5f5;border:1px solid #ddd;border-radius:6px;padding:8px 12px;min-width:80px;text-align:center;}
        .kpi-val{font-size:20px;font-weight:bold;}
        .kpi-lbl{font-size:9px;color:#777;text-transform:uppercase;margin-top:2px;}
        .sec{margin-bottom:14px;}
        .sec-title{font-size:13px;font-weight:bold;border-bottom:2px solid #222;padding-bottom:3px;margin-bottom:8px;}
        .ai-block{background:#f9f9f9;border-left:4px solid #c8a200;padding:8px 12px;margin-bottom:8px;border-radius:0 6px 6px 0;}
        .ai-title{font-weight:bold;font-size:11px;color:#c8a200;margin-bottom:4px;}
        table{width:100%;border-collapse:collapse;font-size:11px;}
        th{background:#222;color:#fff;padding:5px 8px;text-align:left;}
        td{padding:4px 8px;border-bottom:1px solid #eee;}
        .resumo{background:#fffbe6;border:1px solid #f0d060;padding:10px;border-radius:6px;margin-bottom:12px;}
        ul{padding-left:16px;}li{margin-bottom:3px;}
      </style></head><body>${printRef.current?.innerHTML||''}</body></html>`);
    win.document.close(); win.print();
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
