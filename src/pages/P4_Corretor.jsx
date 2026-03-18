import { useState } from 'react';
import { Card, FunilBar, ScoreRing, MiniBar, PersonCard } from '../components/Shared';
import { PainelRastreabilidade } from '../components/VendasExternas';
import { RelatorioModal } from '../components/RelatorioModal';
import { fmt, statusCorretor, topCanais } from '../utils/index';

function RankingCard({ title, corretores, metrica, format, cor, getPhoto, onSelect }) {
  const top5 = [...corretores]
    .filter(c => (c[metrica] || 0) > 0)
    .sort((a, b) => (b[metrica] || 0) - (a[metrica] || 0))
    .slice(0, 5);

  const max = top5[0]?.[metrica] || 1;

  return (
    <Card title={title}>
      {top5.length === 0 && (
        <div className="empty" style={{padding:'12px 0'}}>Sem dados no período</div>
      )}
      {top5.map((c, i) => (
        <div key={c.corretor} className="rank-row" onClick={() => onSelect(c.corretor)}>
          <span className="rank-pos" style={{color: i === 0 ? '#f59e0b' : 'var(--text3)'}}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}º`}
          </span>
          <PersonCard nome={c.corretor} size={28} getPhoto={getPhoto}/>
          <div className="rank-info">
            <div className="rank-nome" translate="no">{c.corretor}</div>
            <div className="rank-bar-bg">
              <div className="rank-bar-fill"
                style={{width: `${((c[metrica]||0)/max)*100}%`, background: cor}}/>
            </div>
          </div>
          <span className="rank-val" style={{color: cor}}>{format(c[metrica] || 0)}</span>
        </div>
      ))}
    </Card>
  );
}

function DisciplinaBlock({ c, controle }) {
  const engaj = c.diasTrabalhados>0 ? (c.antes20h+c.ate00h)/c.diasTrabalhados : 0;
  const padroes = controle?.[c.corretor]?.padroes || [];
  const alerta = controle?.[c.corretor]?.alerta || false;

  return (
    <Card title="⏰ Disciplina & Frequência">
      <div className="disc-grid">
        <div className="disc-item">
          <div className="disc-val" style={{color:c.antes20h/Math.max(1,c.diasTrabalhados)>=0.8?'#34d399':'#fbbf24'}}>
            {fmt.pct(c.diasTrabalhados>0?c.antes20h/c.diasTrabalhados:0)}
          </div>
          <div className="disc-label">Antes das 20h</div>
        </div>
        <div className="disc-item">
          <div className="disc-val" style={{color:'#60a5fa'}}>
            {fmt.pct(c.diasTrabalhados>0?c.ate00h/c.diasTrabalhados:0)}
          </div>
          <div className="disc-label">Até as 00h</div>
        </div>
        <div className="disc-item">
          <div className="disc-val" style={{color:c.retroativo>0?'#f87171':'#94a3b8'}}>
            {fmt.pct(c.diasTrabalhados>0?c.retroativo/c.diasTrabalhados:0)}
          </div>
          <div className="disc-label">Retroativo</div>
        </div>
        <div className="disc-item">
          <div className="disc-val" style={{color:c.folgas>5?'#f87171':'#94a3b8'}}>{c.folgas}</div>
          <div className="disc-label">Folgas</div>
        </div>
      </div>

      {/* Streak */}
      <div className={`streak-banner ${c.streak>=20?'streak-gold':c.streak>=10?'streak-blue':'streak-gray'}`}>
        <span className="streak-icon">{c.streak>=20?'🔥':c.streak>=10?'⚡':'📅'}</span>
        <span>{c.corretor} está há <strong>{c.streak} dias</strong> sem falhar no preenchimento</span>
      </div>

      {/* KPI Alerta disciplina */}
      {(c.folgas>5) && (
        <div className="alerta alerta-vermelho">🔴 Alerta: {c.folgas} folgas no período (meta: ≤5)</div>
      )}

      {/* Padrões de folga */}
      {padroes.length>0 && (
        <div className="padroes-section">
          <div className="section-title" style={{marginBottom:8}}>📊 Padrões de folga identificados</div>
          {padroes.map((p,i)=>(
            <div key={i} className="padrao">⚠️ {p}</div>
          ))}
        </div>
      )}
      {!controle && (
        <div className="padrao-hint">
          ℹ️ Para detectar padrões de folga, publique a aba CONTROLE_DIARIO e configure o GID em config.js
        </div>
      )}
    </Card>
  );
}

function AtividadeBlock({ c, media }) {
  return (
    <Card title="📞 Atividade">
      <div className="atv-list">
        <div className="atv-row">
          <span className="atv-label">Leads novos</span>
          <MiniBar value={c.leads} media={media.leads}/>
        </div>
        <div className="atv-row">
          <span className="atv-label">Repiks</span>
          <MiniBar value={c.repiks} media={media.repiks}/>
        </div>
        <div className="atv-row">
          <span className="atv-label">Discador (min)</span>
          <MiniBar value={c.tempoDiscador} media={media.tempoDiscador}/>
        </div>
      </div>
      <div className="atv-hint">Barra laranja = corretor · Traço = média do time</div>
    </Card>
  );
}

function PerformanceBlock({ c, media, vendas }) {
  const svExt = vendas?.[c.corretor]?.vendaSV ?? null;
  return (
    <Card title="🏆 Funil Pessoal">
      <FunilBar steps={[
        {label:'Leads',             value:c.leads,        color:'#f59e0b'},
        {label:'Agend.',            value:c.agendForm2,   color:'#fb923c'},
        {label:'Visitas',           value:c.visitasForm3, color:'#f97316'},
        {label:'Proposta Assinada', value:c.propostas||0, color:'#ef4444'},
        {label:'Pré-Venda',         value:c.preVendas,    color:'#a855f7'},
        {label:'Venda SV',          value:svExt !== null ? svExt : (c.vendaSV||0), color:'#22c55e'},
      ]}/>
      {svExt === null && (
        <div className="funil-hint" style={{marginTop:6}}>
          💡 Venda SV via Form 3 · Sincronize Power BI para dados do CRM
        </div>
      )}
      <div className="taxas-grid">
        <div className="taxa-item">
          <div className="taxa-val">{fmt.pct(c.taxaLeadAgend)}</div>
          <div className="taxa-label">Lead → Agend.</div>
          <div className="taxa-media">Média: {fmt.pct(media.taxaLeadAgend)}</div>
        </div>
        <div className="taxa-item">
          <div className="taxa-val">{fmt.pct(c.taxaAgendVisita)}</div>
          <div className="taxa-label">Agend. → Visita</div>
          <div className="taxa-media">Média: {fmt.pct(media.taxaAgendVisita)}</div>
        </div>
        <div className="taxa-item">
          <div className="taxa-val">{fmt.pct(c.taxaVisitaConv)}</div>
          <div className="taxa-label">Visita → Conv.</div>
          <div className="taxa-media">Média: {fmt.pct(media.taxaVisitaConv)}</div>
        </div>
        <div className="taxa-item" style={{color:c.noShow>0.2?'#f87171':'inherit'}}>
          <div className="taxa-val">{fmt.pct(c.noShow)}</div>
          <div className="taxa-label">No-Show</div>
          <div className="taxa-media">Média: {fmt.pct(media.noShow)}</div>
        </div>
      </div>
    </Card>
  );
}

function CanaisBlock({ c }) {
  const topAg = topCanais(c.canaisAg, 5);
  const topVs = topCanais(c.canaisVs, 5);

  // Consistência Form1 vs Form2
  const consist = c.agendForm1>0 ? c.agendForm2/c.agendForm1 : 0;
  const consistColor = consist>=0.9?'#34d399':consist>=0.7?'#fbbf24':'#f87171';

  return (
    <Card title="📡 Canais & Consistência">
      {/* Consistência */}
      <div className="consist-row">
        <span className="consist-label">Consistência Form 1 → 2</span>
        <span className="consist-pct" style={{color:consistColor}}>{fmt.pct(consist)}</span>
      </div>
      <div className="consist-detail">
        Form 1 declarou {c.agendForm1} · Form 2 registrou {c.agendForm2}
        {c.divAgend!==0 && <span style={{color:'#f87171'}}> · Divergência: {Math.abs(c.divAgend)}</span>}
      </div>

      <div className="canais-grid">
        {topAg.length>0 && (
          <div>
            <div className="section-title" style={{margin:'16px 0 8px'}}>🗓️ Top canais — Agendamentos</div>
            {topAg.map(([canal,v])=>(
              <div key={canal} className="canal-row">
                <span className="canal-nome">{canal}</span>
                <div className="canal-bar-bg"><div className="canal-bar-fill" style={{width:`${v*100}%`}}/></div>
                <span className="canal-pct">{fmt.pct(v)}</span>
              </div>
            ))}
          </div>
        )}
        {topVs.length>0 && (
          <div>
            <div className="section-title" style={{margin:'16px 0 8px'}}>🏠 Top canais — Visitas</div>
            {topVs.map(([canal,v])=>(
              <div key={canal} className="canal-row">
                <span className="canal-nome">{canal}</span>
                <div className="canal-bar-bg"><div className="canal-bar-fill canal-bar-blue" style={{width:`${v*100}%`}}/></div>
                <span className="canal-pct">{fmt.pct(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function GerenteBlock({ c }) {
  return (
    <Card title="👤 Participação do Gerente">
      <div className="taxas-grid">
        <div className="taxa-item">
          <div className="taxa-val">{c.visitasComGerente}</div>
          <div className="taxa-label">Visitas c/ gerente</div>
        </div>
        <div className="taxa-item">
          <div className="taxa-val">{fmt.pct(c.taxaPartGerente)}</div>
          <div className="taxa-label">Taxa participação</div>
        </div>
        <div className="taxa-item">
          <div className="taxa-val">{fmt.pct(c.taxaConvGerente)}</div>
          <div className="taxa-label">Conv. c/ gerente</div>
        </div>
      </div>
    </Card>
  );
}

export function P4_Corretor({ data, controle, target, setPage, media, getPhoto,
                              vendas, corretoresPBI, alertasRastreabilidade, savePhoto }) {
  const { corretores, supers, gerentes } = data;

  const [selectedSuper, setSelectedSuper] = useState(target?.data?.superintendente || supers[0] || '');
  const [selectedGer,   setSelectedGer]   = useState(target?.data?.gerente || '');
  const [selectedCor,   setSelectedCor]   = useState(target?.nome || '');
  const [showRelatorio, setShowRelatorio] = useState(false);

  const listGer = corretores
    .filter(c=>!selectedSuper||c.superintendente===selectedSuper)
    .map(c=>c.gerente).filter((v,i,a)=>v&&a.indexOf(v)===i).sort();

  const listCor = corretores
    .filter(c=>(!selectedSuper||c.superintendente===selectedSuper)&&(!selectedGer||c.gerente===selectedGer))
    .map(c=>c.corretor).filter((v,i,a)=>v&&a.indexOf(v)===i).sort();

  const corretor = corretores.find(c=>c.corretor===selectedCor) || null;
  const st = corretor ? statusCorretor(corretor) : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">👤 Perfil do Corretor</h2>
          <div className="page-sub">Diagnóstico individual completo</div>
        </div>
        {/* Seletores em cascata */}
        <div className="selects-cascade">
          <select className="select-sm" value={selectedSuper}
            onChange={e=>{setSelectedSuper(e.target.value);setSelectedGer('');setSelectedCor('');}}>
            <option value="">Todas as supers</option>
            {supers.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select-sm" value={selectedGer}
            onChange={e=>{setSelectedGer(e.target.value);setSelectedCor('');}}>
            <option value="">Todos os gerentes</option>
            {listGer.map(g=><option key={g} value={g}>{g}</option>)}
          </select>
          <select className="select-sm" value={selectedCor}
            onChange={e=>setSelectedCor(e.target.value)}>
            <option value="">Selecione o corretor</option>
            {listCor.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {!corretor ? (
        <div className="rankings-grid">
          <RankingCard
            title="🏆 Venda SV"
            corretores={corretores}
            metrica="vendaSV"
            format={v => v}
            cor="#22c55e"
            getPhoto={getPhoto}
            onSelect={nome => setSelectedCor(nome)}
          />
          <RankingCard
            title="⏳ Pré-Vendas"
            corretores={corretores}
            metrica="preVendas"
            format={v => v}
            cor="#a855f7"
            getPhoto={getPhoto}
            onSelect={nome => setSelectedCor(nome)}
          />
          <RankingCard
            title="📝 Propostas Assinadas"
            corretores={corretores}
            metrica="propostas"
            format={v => v}
            cor="#ef4444"
            getPhoto={getPhoto}
            onSelect={nome => setSelectedCor(nome)}
          />
          <RankingCard
            title="✅ Preenchimento em Dia"
            corretores={corretores}
            metrica="antes20h"
            format={v => v + ' dias'}
            cor="#f59e0b"
            getPhoto={getPhoto}
            onSelect={nome => setSelectedCor(nome)}
          />
          <RankingCard
            title="🏠 Visitas Realizadas"
            corretores={corretores}
            metrica="visitasForm3"
            format={v => v}
            cor="#fb923c"
            getPhoto={getPhoto}
            onSelect={nome => setSelectedCor(nome)}
          />
          <RankingCard
            title="📅 Agendamentos"
            corretores={corretores}
            metrica="agendForm2"
            format={v => v}
            cor="#38bdf8"
            getPhoto={getPhoto}
            onSelect={nome => setSelectedCor(nome)}
          />
        </div>
      ) : (
        <>
          {/* Cabeçalho do corretor */}
          <div className="cor-header-card">
            <div className="cor-header-left">
              {/* Foto do corretor */}
              <PersonCard nome={corretor.corretor} size={72} getPhoto={getPhoto}/>
              {/* Score isolado ao lado */}
              <ScoreRing score={st.score}/>
              <div>
                <div className="cor-nome" translate="no">{corretor.corretor}</div>
                <div className="cor-sub" translate="no">{corretor.gerente} · {corretor.superintendente}</div>
                <div className="cor-periodo">{corretor.dataInicio} a {corretor.dataFim} · {corretor.periodo} dias</div>
                {/* Dados do Power BI — dias sem vender, última venda, data início */}
                {corretoresPBI?.[corretor.corretor] != null && (() => {
                  const pbi = corretoresPBI[corretor.corretor];
                  const dias = pbi.diasSemVender ?? pbi; // compatibilidade com formato antigo
                  const diasNum = typeof dias === 'object' ? dias.diasSemVender : dias;
                  const cor = diasNum === 0 ? '#34d399' : diasNum > 14 ? '#f87171' : '#fbbf24';
                  return (
                    <div className="pbi-corretor-info">
                      <span className="pbi-tag" style={{color: cor}}>
                        ⏱ {diasNum === 0 ? 'Vendeu recentemente' : `${diasNum} dias sem vender`}
                      </span>
                      {pbi.dataUltimaVenda && (
                        <span className="pbi-tag">
                          🏆 Última venda: {pbi.dataUltimaVenda}
                        </span>
                      )}
                      {pbi.cargo && (
                        <span className="pbi-tag pbi-tag-cargo">{pbi.cargo}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <button className="btn-relatorio" onClick={() => setShowRelatorio(true)}>
                📄 Gerar Relatório
              </button>
              <span className="badge badge-lg" style={{color:st.color,background:st.bg}}>{st.label}</span>
            </div>
          </div>

          {/* Alerta rastreabilidade individual */}
          {alertasRastreabilidade?.filter(a=>a.corretor===corretor.corretor).length > 0 && (
            <PainelRastreabilidade alertas={alertasRastreabilidade.filter(a=>a.corretor===corretor.corretor)}/>
          )}

          {/* Blocos */}
          <div className="row-2">
            <DisciplinaBlock c={corretor} controle={controle}/>
            <AtividadeBlock  c={corretor} media={media}/>
          </div>
          <PerformanceBlock c={corretor} media={media} vendas={vendas}/>
          <div className="row-2">
            <CanaisBlock  c={corretor}/>
            <GerenteBlock c={corretor}/>
          </div>

          {/* SICAQ */}
          {corretor.sicaqQtd>0 && (
            <Card title="📋 SICAQ">
              <div className="taxas-grid">
                <div className="taxa-item">
                  <div className="taxa-val">{corretor.sicaqQtd}</div>
                  <div className="taxa-label">Qtd aprovados</div>
                </div>
                <div className="taxa-item">
                  <div className="taxa-val">{fmt.pct(corretor.sicaqPerc)}</div>
                  <div className="taxa-label">% sobre agendamentos</div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal de Relatório */}
      {showRelatorio && corretor && (
        <RelatorioModal
          corretor={corretor}
          media={media}
          getPhoto={getPhoto}
          onClose={() => setShowRelatorio(false)}
        />
      )}
    </div>
  );
}
