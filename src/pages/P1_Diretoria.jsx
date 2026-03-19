import { useState } from 'react';
import { KpiCard, FunilBar, Card } from '../components/Shared';
import { BotaoSincVendas, SinoAlertas, CardPBI } from '../components/VendasExternas';
import { fmt, statusCorretor, consolidar } from '../utils/index';

function TopRanking({ title, data, metrica, format, setPage, setTarget }) {
  const sorted = [...data].filter(c=>c[metrica]>0).sort((a,b)=>b[metrica]-a[metrica]).slice(0,5);
  return (
    <Card title={title}>
      {sorted.length===0 && <p className="empty">Sem dados no período</p>}
      {sorted.map((c,i)=>(
        <div key={c.corretor} className="top-row" onClick={()=>{setTarget({type:'corretor',nome:c.corretor,data:c});setPage('corretor');}}>
          <span className="top-pos">{i+1}</span>
          <div className="top-info">
            <span className="top-nome">{c.corretor}</span>
            <span className="top-sub">{c.gerente}</span>
          </div>
          <span className="top-val">{format(c[metrica])}</span>
        </div>
      ))}
    </Card>
  );
}

export function P1_Diretoria({ data, setPage, setTarget,
                                vendas, corretoresPBI, resumoPBI,
                                loadVendas, errVendas, lastVendas, fetchVendas, fetchResumo,
                                alertasRastreabilidade }) {
  const { corretores, media } = data;
  const total = consolidar(corretores);
  if (!total) return null;

  const periodo = corretores[0]?.dataInicio
    ? `${corretores[0].dataInicio} a ${corretores[0].dataFim}` : '';

  // Totais de vendas externas (Power BI)
  const extProp = vendas ? Object.values(vendas).reduce((s,v)=>s+v.proposta,0) : null;
  const extPre  = vendas ? Object.values(vendas).reduce((s,v)=>s+v.preVenda,0) : null;
  const extSV   = vendas ? Object.values(vendas).reduce((s,v)=>s+v.vendaSV,0) : null;

  // Ranking por gerente — inclui vendaSV
  const gerentesMap = {};
  corretores.forEach(c=>{
    if (!gerentesMap[c.gerente]) gerentesMap[c.gerente] = [];
    gerentesMap[c.gerente].push(c);
  });
  const rankGerentes = Object.entries(gerentesMap)
    .map(([g, lista])=>({ gerente:g, ...consolidar(lista) }))
    .sort((a,b)=>(b.vendaSV+b.preVendas)-(a.vendaSV+a.preVendas)).slice(0,5);

  const engaj = total.ativos>0 ? total.engajamento : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">🏛️ Visão Diretoria</h2>
          <div className="page-sub">Consolidado da operação {periodo && `· ${periodo}`}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <BotaoSincVendas loading={loadVendas} lastFetch={lastVendas}
                           error={errVendas}
                           onSync={() => { fetchVendas(); fetchResumo(); }}/>
          <SinoAlertas alertas={alertasRastreabilidade}/>
        </div>
      </div>

      {/* CardPBI — totais do Power BI inline após sync */}

      {/* KPIs — sempre 6 cards, VGV/Recebimento substituem Proposta/Pré-Venda após sync */}
      <div className="kpi-grid kpi-grid-6">
        <KpiCard icon="👥" label="Corretores"      value={`${total.ativos}/${total.total}`} sub={`${total.total-total.ativos} sem registro`}/>
        <KpiCard icon="📞" label="Leads"            value={total.leads}   sub={`Média ${fmt.num(total.leads/Math.max(1,total.ativos),1)}/corretor`}/>
        <KpiCard icon="📅" label="Agendamentos"     value={total.agend}   sub={`Taxa ${fmt.pct(total.txLeadAgend)}`} gold/>
        <KpiCard icon="🏠" label="Visitas"          value={total.visitas} sub={`Conv. ${fmt.pct(total.txConv)}`} gold/>
        {resumoPBI
          ? <KpiCard icon="💰" label="VGV Total"
              value={resumoPBI.vgvTotal >= 1e6
                ? `R$ ${fmt.num(resumoPBI.vgvTotal/1e6, 2)} Milhões`
                : resumoPBI.vgvTotal >= 1000
                ? `R$ ${fmt.num(resumoPBI.vgvTotal/1000, 0)} mil`
                : `R$ ${fmt.num(resumoPBI.vgvTotal, 0)}`}
              sub={resumoPBI.ultimaAtualizacao || 'Power BI'} gold/>
          : <KpiCard icon="📝" label="Proposta Assinada" value={total.propostas} sub="Form 3"/>
        }
        {resumoPBI
          ? <KpiCard icon="🏦" label="Recebimento"
              value={resumoPBI.recebimento >= 1e6
                ? `R$ ${fmt.num(resumoPBI.recebimento/1e6, 2)} Milhões`
                : resumoPBI.recebimento >= 1000
                ? `R$ ${fmt.num(resumoPBI.recebimento/1000, 0)} mil`
                : `R$ ${fmt.num(resumoPBI.recebimento, 0)}`}
              sub={`${fmt.pct(resumoPBI.vgvTotal > 0 ? resumoPBI.recebimento/resumoPBI.vgvTotal : 0)} do VGV`} gold/>
          : <KpiCard icon="⏳" label="Pré-Vendas" value={total.preVendas} sub="SICAQ + entrada" gold/>
        }
      </div>

      {/* Funil 6 etapas + bloco Power BI */}
      <div className="row-2">
        <Card title="⚡ Funil Completo da Operação">
          <FunilBar steps={[
            {label:'Leads',            value:total.leads,      color:'#f59e0b'},
            {label:'Agendamentos',     value:total.agend,      color:'#fb923c'},
            {label:'Visitas',          value:total.visitas,    color:'#f97316'},
            {label:'Proposta Assinada',value:total.propostas,  color:'#ef4444'},
            {label:'Pré-Venda',        value:total.preVendas,  color:'#a855f7'},
            {label:'Venda SV',         value:extSV ?? total.vendaSV, color:'#22c55e'},
          ]}/>
          {!vendas && (
            <div className="funil-hint">
              💡 Sincronize com o Power BI para ver Vendas SV confirmadas
            </div>
          )}
        </Card>

        <Card title="🏢 Por Superintendência">
          {(() => {
            const superMap = {};
            corretores.forEach(c=>{
              if(!superMap[c.superintendente]) superMap[c.superintendente]=[];
              superMap[c.superintendente].push(c);
            });
            return Object.entries(superMap).map(([s,lista])=>{
              const cons = consolidar(lista);
              // Vendas SV externas para essa super
              let svExt = 0;
              if (vendas) lista.forEach(c => { svExt += vendas[c.corretor]?.vendaSV || 0; });
              return (
                <div key={s} className="super-row" onClick={()=>{setTarget({type:'super',nome:s});setPage('super');}}>
                  <div>
                    <div className="super-nome">{s||'—'}</div>
                    <div className="super-sub">{cons.ativos}/{cons.total} ativos</div>
                  </div>
                  <div className="super-stats">
                    <span>📅 {cons.agend}</span>
                    <span>🏠 {cons.visitas}</span>
                    <span className={cons.preVendas>0?'val-gold':''}>⏳ {cons.preVendas}</span>
                    <span className={svExt>0?'val-green':''}>🏆 {svExt > 0 ? svExt : cons.vendaSV}</span>
                  </div>
                </div>
              );
            });
          })()}
        </Card>
      </div>

      {/* Power BI Box — só aparece após sync */}
      {vendas && (
        <Card title="🔗 Dados Power BI — Sistema da Empresa">
          <div className="pbi-grid">
            <div className="pbi-item">
              <div className="pbi-val" style={{color:'#ef4444'}}>{extProp}</div>
              <div className="pbi-lbl">Proposta Assinada</div>
              <div className="pbi-desc">33% vira venda</div>
            </div>
            <div className="pbi-item">
              <div className="pbi-val" style={{color:'#a855f7'}}>{extPre}</div>
              <div className="pbi-lbl">Pré-Venda</div>
              <div className="pbi-desc">SICAQ + entrada</div>
            </div>
            <div className="pbi-item pbi-destaque">
              <div className="pbi-val" style={{color:'#22c55e'}}>{extSV}</div>
              <div className="pbi-lbl">Venda SV ✅</div>
              <div className="pbi-desc">Entrada na Secretaria</div>
            </div>
          </div>
        </Card>
      )}

      {/* Top Rankings */}
      <div className="row-3">
        <TopRanking title="🥇 Top Vendas SV"     data={corretores} metrica="vendaSV"       format={fmt.int} setPage={setPage} setTarget={setTarget}/>
        <TopRanking title="📅 Top Agendamentos"  data={corretores} metrica="agendForm2"    format={fmt.int} setPage={setPage} setTarget={setTarget}/>
        <TopRanking title="📊 Top Conversão"     data={corretores} metrica="taxaVisitaConv" format={v=>fmt.pct(v)} setPage={setPage} setTarget={setTarget}/>
      </div>

      {/* Top Gerentes */}
      <Card title="👥 Ranking de Gerentes">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>#</th><th>Gerente</th><th>Corretores</th>
              <th>Agend.</th><th>Visitas</th>
              <th>Proposta</th><th>Pré-Venda</th><th>Venda SV</th>
              <th>Conv.</th>
            </tr></thead>
            <tbody>
              {rankGerentes.map((g,i)=>{
                let svExt = 0;
                if (vendas) corretores.filter(c=>c.gerente===g.gerente)
                  .forEach(c => { svExt += vendas[c.corretor]?.vendaSV || 0; });
                return (
                  <tr key={g.gerente} className="clickable" onClick={()=>{setTarget({type:'gerente',nome:g.gerente});setPage('gerencia');}}>
                    <td className="td-rank">{i+1}</td>
                    <td className="td-nome">{g.gerente}</td>
                    <td>{g.ativos}/{g.total}</td>
                    <td>{g.agend}</td>
                    <td>{g.visitas}</td>
                    <td style={{color:'#ef4444'}}>{g.propostas||0}</td>
                    <td className={g.preVendas>0?'val-gold':''}>{g.preVendas}</td>
                    <td className={svExt>0?'val-green':''}>{svExt > 0 ? svExt : (g.vendaSV||0)}</td>
                    <td>{fmt.pct(g.txConv)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
