/**
 * VendasExternas — botão de sincronização + painel de rastreabilidade
 */
import { LABEL_VENDA, TIPOS_VENDA } from '../hooks/useVendasExternas';
import { fmt } from '../utils/index';

export function BotaoSincVendas({ loading, lastFetch, error, onSync }) {
  return (
    <div className="sync-vendas-wrap">
      <button className="btn-sync-vendas" onClick={onSync} disabled={loading}>
        {loading ? '⏳ Sincronizando...' : '🔄 Sincronizar Vendas (Power BI)'}
      </button>
      {lastFetch && (
        <span className="sync-vendas-ts">
          Última sync: {lastFetch.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
        </span>
      )}
      {error && (
        <div className="sync-vendas-erro">{error}</div>
      )}
    </div>
  );
}

export function PainelRastreabilidade({ alertas }) {
  if (!alertas?.length) return null;
  return (
    <div className="rastreabilidade-wrap">
      <div className="rastreabilidade-title">
        ⚠️ Alertas de Rastreabilidade — {alertas.length} corretor(es) com venda sem preenchimento completo
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
          <div className="rastro-msg">{a.msg}</div>
        </div>
      ))}
    </div>
  );
}

export function FunilCompleto({ data, vendas, filtro }) {
  const { corretores } = data;

  const filtrados = corretores.filter(c => {
    if (filtro?.super && c.superintendente !== filtro.super) return false;
    if (filtro?.gerente && c.gerente !== filtro.gerente) return false;
    return true;
  });

  const leads    = filtrados.reduce((s,c) => s+c.leads, 0);
  const agend    = filtrados.reduce((s,c) => s+c.agendForm2, 0);
  const visitas  = filtrados.reduce((s,c) => s+c.visitasForm3, 0);
  const propostas = filtrados.reduce((s,c) => s+c.propostas, 0);
  const preVendas = filtrados.reduce((s,c) => s+c.preVendas, 0);

  // Vendas SV: das externas, filtrando pelos corretores do filtro
  let vendaSV = 0;
  if (vendas) {
    filtrados.forEach(c => {
      vendaSV += vendas[c.corretor]?.vendaSV || 0;
    });
  }

  const steps = [
    { label: 'Leads',     value: leads,     color: '#f59e0b', taxa: null },
    { label: 'Agend.',    value: agend,     color: '#fb923c', taxa: agend/Math.max(1,leads) },
    { label: 'Visitas',   value: visitas,   color: '#f97316', taxa: visitas/Math.max(1,agend) },
    { label: 'Proposta',  value: propostas, color: '#ef4444', taxa: propostas/Math.max(1,visitas) },
    { label: 'Pré-Venda', value: preVendas, color: '#a855f7', taxa: preVendas/Math.max(1,propostas) },
    { label: 'Venda SV',  value: vendaSV,   color: '#22c55e', taxa: vendaSV/Math.max(1,preVendas) },
  ];

  const max = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="funil">
      {steps.map((s, i) => (
        <div key={s.label} className="funil-step">
          <div className="funil-row">
            <span className="funil-label">{s.label}</span>
            <span className="funil-val" style={{color: s.color}}>{s.value}</span>
            {s.taxa !== null && s.taxa > 0 && (
              <span className="funil-taxa">→ {fmt.pct(s.taxa)}</span>
            )}
            {i >= 3 && s.value === 0 && (
              <span className="funil-hint">
                {i === 3 ? '(Form3: Proposta)' : i === 4 ? '(Form3: Pré-Venda)' : '(Power BI)'}
              </span>
            )}
          </div>
          <div className="funil-bg">
            <div className="funil-fill"
              style={{width:`${(s.value/max)*100}%`, background: s.color}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// Card resumo de vendas externas para uma lista de corretores
export function ResumoVendasExternas({ corretores, vendas }) {
  if (!vendas) return (
    <div className="vendas-ext-hint">
      Clique em "Sincronizar Vendas" para cruzar com a dashboard da empresa
    </div>
  );

  let totProp=0, totPre=0, totSV=0;
  corretores.forEach(c => {
    const v = vendas[c.corretor];
    if (!v) return;
    totProp += v.proposta; totPre += v.preVenda; totSV += v.vendaSV;
  });

  if (totProp+totPre+totSV === 0) return (
    <div className="vendas-ext-hint">Nenhuma venda externa registrada para esta equipe</div>
  );

  return (
    <div className="vendas-ext-row">
      <div className="vendas-ext-item">
        <div className="vendas-ext-val" style={{color:'#ef4444'}}>{totProp}</div>
        <div className="vendas-ext-lbl">Proposta</div>
      </div>
      <div className="vendas-ext-item">
        <div className="vendas-ext-val" style={{color:'#a855f7'}}>{totPre}</div>
        <div className="vendas-ext-lbl">Pré-Venda</div>
      </div>
      <div className="vendas-ext-item vendas-ext-destaque">
        <div className="vendas-ext-val" style={{color:'#22c55e'}}>{totSV}</div>
        <div className="vendas-ext-lbl">Venda SV</div>
      </div>
    </div>
  );
}
