import { useState } from 'react';
import { KpiCard, FunilBar, Card } from '../components/Shared';
import { BotaoSincVendas, SinoAlertas } from '../components/VendasExternas';
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

// ─── Modal de lista de vendas ─────────────────────────────────────────────────
function ModalListaVendas({ tipo, vendas, onClose }) {
  const tipoMap = { vendaSV: 'vendaSV', preVenda: 'preVenda', proposta: 'proposta' };
  const titulos = { vendaSV: '🏆 Vendas SV', preVenda: '⏳ Pré-Vendas', proposta: '📝 Propostas Assinadas' };
  const cores   = { vendaSV: '#22c55e',       preVenda: '#a855f7',        proposta: '#ef4444' };

  const itens = [];
  if (vendas) {
    Object.entries(vendas).forEach(([corretor, d]) => {
      (d.detalhes || []).forEach(det => {
        if (det.tipo === tipoMap[tipo]) itens.push({ corretor, ...det });
      });
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{color: cores[tipo]}}>{titulos[tipo]} <span className="modal-count">{itens.length}</span></h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {itens.length === 0 && <div className="empty">Sem dados disponíveis</div>}
          <table className="data-table">
            <thead><tr>
              <th>Corretor</th><th>Empreendimento / Cliente</th><th>Estágio</th><th>Data</th>
            </tr></thead>
            <tbody>
              {itens.map((it, i) => {
                // linhaBruta: "CORRETOR | GERENTE | SUPER | EMPREEN | ESTAGIO"
                const partes = (it.linhaBruta || '').split(' | ');
                const empreen = it.cliente || partes[3] || '—';
                const estagio = partes[4] || it.tipo || '—';
                return (
                  <tr key={i}>
                    <td className="td-nome">{it.corretor}</td>
                    <td>{empreen}</td>
                    <td style={{color: cores[tipo], fontSize:'12px'}}>{estagio}</td>
                    <td style={{color:'var(--text3)', fontSize:'12px'}}>{it.data || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function P1_Diretoria({ data, setPage, setTarget,
                                vendas, corretoresPBI, resumoPBI,
                                loadVendas, errVendas, lastVendas, fetchVendas, fetchResumo,
                                alertasRastreabilidade }) {
  const { corretores, media } = data;
  const total = consolidar(corretores);
  if (!total) return null;

  const [modalTipo, setModalTipo] = useState(null);

  const periodo = corretores[0]?.dataInicio
    ? `${corretores[0].dataInicio} a ${corretores[0].dataFim}` : '';

  const extProp = vendas ? Object.values(vendas).reduce((s,v)=>s+v.proposta,0) : null;
  const extPre  = vendas ? Object.values(vendas).reduce((s,v)=>s+v.preVenda,0) : null;
  const extSV   = vendas ? Object.values(vendas).reduce((s,v)=>s+v.vendaSV,0) : null;

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
      {modalTipo && <ModalListaVendas tipo={modalTipo} vendas={vendas} onClose={()=>setModalTipo(null)}/>}

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

      {/* KPIs dos Forms — sempre visíveis */}
      <div className="kpi-grid kpi-grid-6">
        <KpiCard icon="👥" label="Corretores"       value={`${total.ativos}/${total.total}`} sub={`${total.total-total.ativos} sem registro`}/>
        <KpiCard icon="📞" label="Leads"             value={total.leads}     sub={`Média ${fmt.num(total.leads/Math.max(1,total.ativos),1)}/corretor`}/>
        <KpiCard icon="📅" label="Agendamentos"      value={total.agend}     sub={`Taxa ${fmt.pct(total.txLeadAgend)}`} gold/>
        <KpiCard icon="🏠" label="Visitas"           value={total.visitas}   sub={`Conv. ${fmt.pct(total.txConv)}`} gold/>
        <KpiCard icon="📝" label="Proposta Assinada" value={total.propostas} sub="Form 3"/>
        <KpiCard icon="⏳" label="Pré-Vendas"        value={total.preVendas} sub="SICAQ + entrada" gold/>
      </div>

      {/* Barra Power BI — aparece após sync, ordem: VGV, Recebimento, Venda SV, Pré-Vendas, Propostas */}
      {vendas && (
        <div className="pbi-kpi-bar">
          {/* VGV e Recebimento — estilo dourado, sem clique */}
          {resumoPBI && <>
            <div className="pbi-kpi-item pbi-kpi-gold">
              <div className="pbi-kpi-val">
                {resumoPBI.vgvTotal >= 1e6
                  ? `R$ ${fmt.num(resumoPBI.vgvTotal/1e6, 2)} Milhões`
                  : `R$ ${fmt.num(resumoPBI.vgvTotal/1000, 0)} mil`}
              </div>
              <div className="pbi-kpi-lbl">VGV Total</div>
              <div className="pbi-kpi-sub">{resumoPBI.ultimaAtualizacao || 'Power BI'}</div>
            </div>
            <div className="pbi-kpi-item pbi-kpi-gold">
              <div className="pbi-kpi-val">
                {resumoPBI.recebimento >= 1e6
                  ? `R$ ${fmt.num(resumoPBI.recebimento/1e6, 2)} Milhões`
                  : `R$ ${fmt.num(resumoPBI.recebimento/1000, 0)} mil`}
              </div>
              <div className="pbi-kpi-lbl">Recebimento</div>
              <div className="pbi-kpi-sub">{fmt.pct(resumoPBI.vgvTotal > 0 ? resumoPBI.recebimento/resumoPBI.vgvTotal : 0)} do VGV</div>
            </div>
            <div className="pbi-kpi-divider"/>
          </>}

          {/* Venda SV, Pré-Vendas, Propostas — clicáveis */}
          <div className="pbi-kpi-item pbi-kpi-clickable" onClick={()=>setModalTipo('vendaSV')}>
            <div className="pbi-kpi-val" style={{color:'#22c55e'}}>{extSV}</div>
            <div className="pbi-kpi-lbl">Venda SV ✅</div>
            <div className="pbi-kpi-sub">Entrada na Secretaria</div>
          </div>
          <div className="pbi-kpi-item pbi-kpi-clickable" onClick={()=>setModalTipo('preVenda')}>
            <div className="pbi-kpi-val" style={{color:'#a855f7'}}>{extPre}</div>
            <div className="pbi-kpi-lbl">Pré-Venda</div>
            <div className="pbi-kpi-sub">SICAQ + entrada</div>
          </div>
          <div className="pbi-kpi-item pbi-kpi-clickable" onClick={()=>setModalTipo('proposta')}>
            <div className="pbi-kpi-val" style={{color:'#ef4444'}}>{extProp}</div>
            <div className="pbi-kpi-lbl">Proposta Assinada</div>
            <div className="pbi-kpi-sub">33% vira venda</div>
          </div>
        </div>
      )}

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
