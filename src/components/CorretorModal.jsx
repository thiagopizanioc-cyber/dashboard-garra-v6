import { fmt, topCanais, classificarCorretor } from '../utils/format';

function MetricaItem({ label, value, compare, isPercent }) {
  const delta = compare !== undefined ? (isPercent ? value - compare : value - compare) : null;
  const up = delta !== null && delta > 0;
  const down = delta !== null && delta < 0;
  return (
    <div className="metrica-item">
      <span className="metrica-label">{label}</span>
      <span className="metrica-value">
        {isPercent ? fmt.pct(value) : value}
        {delta !== null && (
          <span className={`delta ${up ? 'up' : down ? 'down' : ''}`}>
            {up ? '↑' : down ? '↓' : '–'}
            {isPercent ? fmt.pct(Math.abs(delta)) : Math.abs(delta).toFixed(1)}
          </span>
        )}
      </span>
    </div>
  );
}

export function CorretorModal({ corretor, media, onClose }) {
  if (!corretor) return null;
  const c = corretor;
  const cls = classificarCorretor(c);
  const topAg = topCanais(c.canaisAg);
  const topVs = topCanais(c.canaisVs);
  const engaj = c.diasTrabalhados > 0
    ? (c.antes20h + c.ate00h) / c.diasTrabalhados
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="modal-header">
          <div>
            <h2 className="modal-nome">{c.corretor}</h2>
            <div className="modal-sub">{c.gerente} · {c.superintendente}</div>
          </div>
          <span className="badge badge-lg" style={{ color: cls.color, background: cls.bg }}>{cls.label}</span>
        </div>

        <div className="modal-grid">
          {/* DISCIPLINA */}
          <div className="modal-section">
            <h4 className="section-title">⏰ Disciplina</h4>
            <MetricaItem label="Dias trabalhados" value={c.diasTrabalhados} compare={media.diasTrabalhados} />
            <MetricaItem label="Folgas" value={c.folgas} />
            <MetricaItem label="Antes das 20h" value={c.antes20h} />
            <MetricaItem label="Até 00h" value={c.ate00h} />
            <MetricaItem label="Retroativo" value={c.retroativo} />
            <MetricaItem label="Streak atual" value={`${c.streak} dias`} />
            <MetricaItem label="Engajamento" value={engaj} isPercent />
          </div>

          {/* ATIVIDADE */}
          <div className="modal-section">
            <h4 className="section-title">📞 Atividade</h4>
            <MetricaItem label="Leads novos" value={c.leads} compare={media.leads} />
            <MetricaItem label="Repiks" value={c.repiks} compare={media.repiks} />
            <MetricaItem label="Discador (min)" value={c.tempoDiscador} compare={media.tempoDiscador} />
          </div>

          {/* PERFORMANCE */}
          <div className="modal-section">
            <h4 className="section-title">🏆 Performance</h4>
            <MetricaItem label="Agendamentos" value={c.agendForm2} compare={media.agendForm2} />
            <MetricaItem label="Visitas" value={c.visitasForm3} compare={media.visitasForm3} />
            <MetricaItem label="Pré-Vendas" value={c.preVendas} compare={media.preVendas} />
            <MetricaItem label="Propostas" value={c.propostas} />
            <MetricaItem label="Taxa Lead→Agend" value={c.taxaLeadAgend} compare={media.taxaLeadAgend} isPercent />
            <MetricaItem label="Taxa Agend→Visita" value={c.taxaAgendVisita} compare={media.taxaAgendVisita} isPercent />
            <MetricaItem label="Taxa Conversão" value={c.taxaVisitaConv} compare={media.taxaVisitaConv} isPercent />
            <MetricaItem label="No-Show" value={c.noShow} isPercent />
          </div>

          {/* GERENTE */}
          <div className="modal-section">
            <h4 className="section-title">👤 Gerente na Visita</h4>
            <MetricaItem label="Visitas c/ gerente" value={c.visitasComGerente} />
            <MetricaItem label="Taxa participação" value={c.taxaParticipacaoGerente} isPercent />
            <MetricaItem label="Conv. c/ gerente" value={c.taxaConvGerente} isPercent />
          </div>
        </div>

        {/* CANAIS */}
        {(topAg.length > 0 || topVs.length > 0) && (
          <div className="modal-canais">
            {topAg.length > 0 && (
              <div>
                <h4 className="section-title">📡 Top Canais de Agendamento</h4>
                {topAg.map(([canal, v]) => (
                  <div key={canal} className="canal-item">
                    <span>{canal}</span>
                    <div className="canal-bar-bg">
                      <div className="canal-bar-fill" style={{ width: `${v * 100}%` }} />
                    </div>
                    <span>{fmt.pct(v)}</span>
                  </div>
                ))}
              </div>
            )}
            {topVs.length > 0 && (
              <div>
                <h4 className="section-title">🏠 Top Canais de Visita</h4>
                {topVs.map(([canal, v]) => (
                  <div key={canal} className="canal-item">
                    <span>{canal}</span>
                    <div className="canal-bar-bg">
                      <div className="canal-bar-fill canal-bar-vs" style={{ width: `${v * 100}%` }} />
                    </div>
                    <span>{fmt.pct(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
