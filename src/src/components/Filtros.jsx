export function Filtros({ data, filtro, setFiltro }) {
  const { superintendentes, gerentes, corretores } = data;

  const gerentesFiltrados = filtro.super
    ? [...new Set(corretores.filter(c => c.superintendente === filtro.super).map(c => c.gerente))].sort()
    : gerentes;

  function handleSuper(e) {
    setFiltro({ super: e.target.value || null, gerente: null });
  }

  function handleGerente(e) {
    setFiltro(f => ({ ...f, gerente: e.target.value || null }));
  }

  const ativos = corretores.filter(c => {
    if (filtro.super && c.superintendente !== filtro.super) return false;
    if (filtro.gerente && c.gerente !== filtro.gerente) return false;
    return c.diasTrabalhados > 0;
  }).length;

  const total = corretores.filter(c => {
    if (filtro.super && c.superintendente !== filtro.super) return false;
    if (filtro.gerente && c.gerente !== filtro.gerente) return false;
    return true;
  }).length;

  return (
    <div className="filtros-bar">
      <div className="filtros-selects">
        <div className="select-wrap">
          <label>Superintendência</label>
          <select value={filtro.super || ''} onChange={handleSuper}>
            <option value="">Todas</option>
            {superintendentes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="select-wrap">
          <label>Gerente</label>
          <select value={filtro.gerente || ''} onChange={handleGerente} disabled={!filtro.super && gerentesFiltrados.length === gerentes.length}>
            <option value="">Todos</option>
            {gerentesFiltrados.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="filtros-info">
        <span className="info-chip">🟢 {ativos} com dados</span>
        <span className="info-chip">👥 {total} total</span>
      </div>
    </div>
  );
}
