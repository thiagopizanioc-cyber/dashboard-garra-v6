/**
 * VendasExternas — botão sync + sino de alertas de rastreabilidade
 */
import { useState } from 'react';
import { fmt } from '../utils/index';

// ─── BOTÃO SINCRONIZAR ────────────────────────────────────────────────────────
export function BotaoSincVendas({ loading, lastFetch, error, onSync }) {
  return (
    <div className="sync-vendas-wrap">
      <button className="btn-sync-vendas" onClick={onSync} disabled={loading}>
        {loading ? '⏳ Sincronizando...' : '🔄 Sincronizar (Power BI)'}
      </button>
      {lastFetch && (
        <span className="sync-vendas-ts">
          Última sync: {lastFetch.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
        </span>
      )}
      {error && <div className="sync-vendas-erro">{error}</div>}
    </div>
  );
}

// ─── SINO DE ALERTAS ─────────────────────────────────────────────────────────
export function SinoAlertas({ alertas }) {
  const [aberto, setAberto] = useState(false);
  if (!alertas?.length) return null;

  const total = alertas.length;
  // Prioridade: vermelho se tem alguém com Form 1 faltando (mais grave)
  const temGrave = alertas.some(a => a.msg.includes('Form 1'));

  return (
    <div className="sino-wrap">
      <button
        className={`sino-btn ${temGrave ? 'sino-grave' : 'sino-warn'}`}
        onClick={() => setAberto(o => !o)}
        title="Alertas de rastreabilidade"
      >
        {/* Ícone sino SVG */}
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span className="sino-badge">{total}</span>
      </button>

      {aberto && (
        <>
          {/* Overlay clicável para fechar */}
          <div className="sino-overlay" onClick={() => setAberto(false)}/>
          <div className="sino-dropdown">
            <div className="sino-header">
              <span>⚠️ {total} corretor(es) com venda sem preenchimento</span>
              <button className="sino-fechar" onClick={() => setAberto(false)}>✕</button>
            </div>
            <div className="sino-lista">
              {alertas.map((a, i) => (
                <div key={i} className="sino-item">
                  <div className="sino-item-header">
                    <span className="sino-item-nome" translate="no">{a.corretor}</span>
                    <div className="sino-item-badges">
                      {a.dados.vendaSV  > 0 && <span className="rastro-badge sv">{a.dados.vendaSV} Venda SV</span>}
                      {a.dados.preVenda > 0 && <span className="rastro-badge pre">{a.dados.preVenda} Pré-Venda</span>}
                      {a.dados.proposta > 0 && <span className="rastro-badge prop">{a.dados.proposta} Proposta</span>}
                    </div>
                  </div>
                  <div className="sino-item-detalhe">
                    {/* Extrai só o "falta: ..." da mensagem */}
                    {a.msg.includes('falta:') ? `Falta: ${a.msg.split('falta:')[1].trim()}` : a.msg}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── CARD RESUMO POWER BI ─────────────────────────────────────────────────────
export function CardPBI({ vendas, resumoPBI }) {
  if (!vendas && !resumoPBI) return null;

  const extProp = vendas ? Object.values(vendas).reduce((s,v)=>s+v.proposta,0) : null;
  const extPre  = vendas ? Object.values(vendas).reduce((s,v)=>s+v.preVenda,0) : null;
  const extSV   = vendas ? Object.values(vendas).reduce((s,v)=>s+v.vendaSV,0) : null;

  return (
    <div className="pbi-card-row">
      {extSV !== null && (
        <>
          <div className="pbi-mini"><div className="pbi-mini-val" style={{color:'#ef4444'}}>{extProp}</div><div className="pbi-mini-lbl">Proposta</div></div>
          <div className="pbi-mini"><div className="pbi-mini-val" style={{color:'#a855f7'}}>{extPre}</div><div className="pbi-mini-lbl">Pré-Venda</div></div>
          <div className="pbi-mini pbi-mini-destaque"><div className="pbi-mini-val" style={{color:'#22c55e'}}>{extSV}</div><div className="pbi-mini-lbl">Venda SV ✅</div></div>
        </>
      )}
      {resumoPBI && (
        <>
          <div className="pbi-mini pbi-mini-sep"/>
          <div className="pbi-mini"><div className="pbi-mini-val pbi-mini-dinheiro">R$ {fmt.num(resumoPBI.vgvTotal/1000,0)}k</div><div className="pbi-mini-lbl">VGV Total</div></div>
          <div className="pbi-mini"><div className="pbi-mini-val pbi-mini-dinheiro">R$ {fmt.num(resumoPBI.recebimento/1000,0)}k</div><div className="pbi-mini-lbl">Recebimento</div></div>
        </>
      )}
    </div>
  );
}

// ─── PAINEL LEGADO (mantido para P3/P4 individuais) ──────────────────────────
export function PainelRastreabilidade({ alertas }) {
  if (!alertas?.length) return null;
  return (
    <div className="rastreabilidade-wrap">
      <div className="rastreabilidade-title">
        ⚠️ {alertas.length} corretor(es) com venda sem preenchimento
      </div>
      {alertas.map((a, i) => (
        <div key={i} className="rastro-item">
          <div className="rastro-header">
            <span className="rastro-nome" translate="no">{a.corretor}</span>
            <div className="rastro-badges">
              {a.dados.vendaSV  > 0 && <span className="rastro-badge sv">{a.dados.vendaSV} Venda SV</span>}
              {a.dados.preVenda > 0 && <span className="rastro-badge pre">{a.dados.preVenda} Pré-Venda</span>}
              {a.dados.proposta > 0 && <span className="rastro-badge prop">{a.dados.proposta} Proposta</span>}
            </div>
          </div>
          <div className="rastro-msg">
            {a.msg.includes('falta:') ? `Falta: ${a.msg.split('falta:')[1].trim()}` : a.msg}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── BOTÃO EXTRATO FORM1 ──────────────────────────────────────────────────────
// Mostra quem não preencheu o Form1 em uma data específica
// Filtra pela super/gerente conforme o contexto da página
export function BotaoForm1({ raw, corretores }) {
  const [aberto, setAberto]         = useState(false);
  const [dataFiltro, setDataFiltro] = useState(() => {
    // Usa fuso local para evitar bug UTC
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [corretorFiltro, setCorretorFiltro] = useState('');

  if (!raw?.form1 || !corretores?.length) return null;

  // Compara datas no fuso local — evita bug UTC
  const d0local = d => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  };

  const nomesEquipe = corretores.map(c => c.corretor);

  // Quem preencheu: pega todos os registros do form1 para a data selecionada
  // Pode ter múltiplos (repreenchimento), mantemos o mais recente
  const mapaPreencheram = {};
  raw.form1
    .filter(r => d0local(r.data) === dataFiltro && nomesEquipe.includes(r.corretor))
    .forEach(r => {
      // Guarda o registro com o timestamp mais recente
      if (!mapaPreencheram[r.corretor] || r.timestamp > mapaPreencheram[r.corretor].timestamp) {
        mapaPreencheram[r.corretor] = r;
      }
    });

  // Quem estava de folga
  const folgaram = new Set(
    (raw.controle || [])
      .filter(r => d0local(r.data) === dataFiltro
                && nomesEquipe.includes(r.corretor)
                && r.status.toLowerCase().includes('folga'))
      .map(r => r.corretor)
  );

  const fmtTs = ts => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const fmtDataRelatorio = str => {
    if (!str) return '—';
    const [y,m,d] = str.split('-');
    return `${d}/${m}/${y}`;
  };

  // Separa em preenchidos e pendentes
  const filtrados = nomesEquipe.filter(n => corretorFiltro ? n === corretorFiltro : true);

  const preenchidos = filtrados
    .filter(n => mapaPreencheram[n] && !folgaram.has(n))
    .map(n => ({ nome: n, registro: mapaPreencheram[n] }))
    .sort((a,b) => a.nome.localeCompare(b.nome));

  const folgas = filtrados
    .filter(n => folgaram.has(n))
    .map(n => ({ nome: n }));

  const pendentes = filtrados
    .filter(n => !mapaPreencheram[n] && !folgaram.has(n))
    .map(n => ({ nome: n }))
    .sort((a,b) => a.nome.localeCompare(b.nome));

  const totalPendentes = nomesEquipe.filter(n => !mapaPreencheram[n] && !folgaram.has(n)).length;

  return (
    <div style={{position:'relative'}}>
      <button className="btn-form1" onClick={() => setAberto(!aberto)} title="Extrato Form 1">
        📋
        {totalPendentes > 0 && <span className="form1-badge">{totalPendentes}</span>}
      </button>

      {aberto && (
        <div className="form1-dropdown" onClick={e => e.stopPropagation()}>
          <div className="form1-header">
            <span>📋 Extrato Form 1</span>
            <button onClick={() => setAberto(false)} className="form1-close">✕</button>
          </div>
          <div className="form1-filtros">
            <input type="date" value={dataFiltro}
              onChange={e => setDataFiltro(e.target.value)}
              className="form1-input-data"/>
            <select value={corretorFiltro}
              onChange={e => setCorretorFiltro(e.target.value)}
              className="form1-select">
              <option value="">Todos os corretores</option>
              {nomesEquipe.sort().map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="form1-resumo">
            <span style={{color:'#22c55e'}}>✅ {preenchidos.length}</span>
            <span style={{color:'#f87171'}}>❌ {pendentes.length} pendentes</span>
            <span style={{color:'#94a3b8'}}>🏖️ {folgas.length} folgas</span>
          </div>
          <div className="form1-lista">

            {/* PREENCHIDOS — com data do relatório e horário de envio */}
            {preenchidos.length > 0 && (
              <>
                <div className="form1-secao">✅ Preenchidos</div>
                {preenchidos.map(item => (
                  <div key={item.nome} className="form1-item" style={{borderLeftColor:'#22c55e'}}>
                    <span className="form1-nome" translate="no">{item.nome}</span>
                    <div className="form1-detalhe">
                      <span className="form1-data-rel">{fmtDataRelatorio(d0local(item.registro.data))}</span>
                      <span className="form1-ts" style={{color:'#22c55e'}}>{fmtTs(item.registro.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* FOLGAS */}
            {folgas.length > 0 && (
              <>
                <div className="form1-secao">🏖️ Folgas</div>
                {folgas.map(item => (
                  <div key={item.nome} className="form1-item" style={{borderLeftColor:'#94a3b8'}}>
                    <span className="form1-nome" translate="no">{item.nome}</span>
                    <span style={{fontSize:'11px',color:'#94a3b8'}}>folga</span>
                  </div>
                ))}
              </>
            )}

            {/* PENDENTES */}
            {pendentes.length > 0 && (
              <>
                <div className="form1-secao" style={{color:'#f87171'}}>❌ Pendentes</div>
                {pendentes.map(item => (
                  <div key={item.nome} className="form1-item" style={{borderLeftColor:'#f87171'}}>
                    <span className="form1-nome" translate="no">{item.nome}</span>
                    <span style={{fontSize:'11px',color:'#f87171'}}>pendente</span>
                  </div>
                ))}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
