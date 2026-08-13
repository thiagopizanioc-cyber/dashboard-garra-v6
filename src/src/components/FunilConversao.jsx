import { fmt } from '../utils/format';

export function FunilConversao({ data, filtro }) {
  const { corretores } = data;

  const filtrados = corretores.filter(c => {
    if (filtro.super && c.superintendente !== filtro.super) return false;
    if (filtro.gerente && c.gerente !== filtro.gerente) return false;
    return true;
  });

  const leads = filtrados.reduce((s, c) => s + c.leads, 0);
  const agend = filtrados.reduce((s, c) => s + c.agendForm2, 0);
  const visitas = filtrados.reduce((s, c) => s + c.visitasForm3, 0);
  const preVendas = filtrados.reduce((s, c) => s + c.preVendas, 0);

  const steps = [
    { label: 'Leads', value: leads, color: '#f59e0b' },
    { label: 'Agendamentos', value: agend, color: '#fb923c' },
    { label: 'Visitas', value: visitas, color: '#f97316' },
    { label: 'Pré-Vendas', value: preVendas, color: '#ea580c' },
  ];

  const max = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="card funil-card">
      <h3 className="card-title">⚡ Funil de Conversão</h3>
      <div className="funil-steps">
        {steps.map((step, i) => {
          const width = (step.value / max) * 100;
          const taxa = i > 0 && steps[i - 1].value > 0
            ? (step.value / steps[i - 1].value)
            : null;
          return (
            <div key={step.label} className="funil-step">
              <div className="funil-label-row">
                <span className="funil-label">{step.label}</span>
                <span className="funil-value" style={{ color: step.color }}>{step.value}</span>
                {taxa !== null && (
                  <span className="funil-taxa">→ {fmt.pct(taxa)}</span>
                )}
              </div>
              <div className="funil-bar-bg">
                <div
                  className="funil-bar-fill"
                  style={{
                    width: `${width}%`,
                    background: step.color,
                    animationDelay: `${i * 0.15}s`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
