import { fmt } from '../utils/format';

function KpiCard({ label, value, sub, accent = false, icon }) {
  return (
    <div className={`kpi-card ${accent ? 'kpi-accent' : ''}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export function KpiRow({ data }) {
  const { corretores, media } = data;

  const ativos = corretores.filter(c => c.diasTrabalhados > 0).length;
  const totalLeads = corretores.reduce((s, c) => s + c.leads, 0);
  const totalAgend = corretores.reduce((s, c) => s + c.agendForm2, 0);
  const totalVisitas = corretores.reduce((s, c) => s + c.visitasForm3, 0);
  const totalPreVendas = corretores.reduce((s, c) => s + c.preVendas, 0);
  const mediaEngaj = ativos > 0
    ? corretores.filter(c => c.diasTrabalhados > 0).reduce((s, c) => {
        const tx = c.diasTrabalhados > 0 ? (c.antes20h + c.ate00h) / c.diasTrabalhados : 0;
        return s + tx;
      }, 0) / ativos
    : 0;

  const txAgend = totalLeads > 0 ? totalAgend / totalLeads : 0;
  const txVisita = totalAgend > 0 ? totalVisitas / totalAgend : 0;
  const txConv = totalVisitas > 0 ? totalPreVendas / totalVisitas : 0;

  return (
    <div className="kpi-row">
      <KpiCard icon="👥" label="Corretores Ativos" value={`${ativos}/${corretores.length}`}
        sub={`${corretores.length - ativos} sem registro`} />
      <KpiCard icon="📞" label="Leads Totais" value={totalLeads}
        sub={`Média: ${fmt.num(totalLeads / Math.max(1, ativos), 1)}/corretor`} />
      <KpiCard icon="📅" label="Agendamentos" value={totalAgend}
        sub={`Taxa: ${fmt.pct(txAgend)}`} accent />
      <KpiCard icon="🏠" label="Visitas" value={totalVisitas}
        sub={`Taxa: ${fmt.pct(txVisita)}`} accent />
      <KpiCard icon="🏆" label="Pré-Vendas" value={totalPreVendas}
        sub={`Conv: ${fmt.pct(txConv)}`} accent />
      <KpiCard icon="⏰" label="Engajamento" value={fmt.pct(mediaEngaj)}
        sub="Preenchimento em dia" />
    </div>
  );
}
