const PAGES = [
  { id:'diretoria',      icon:'🏛️',  label:'Diretoria',       sub:'Visão macro' },
  { id:'super',          icon:'🏢',  label:'Superintendência', sub:'Por equipe' },
  { id:'gerencia',       icon:'👥',  label:'Gerência',         sub:'Por célula' },
  { id:'corretor',       icon:'👤',  label:'Corretor',         sub:'Perfil individual' },
  { id:'arena',          icon:'⚡',  label:'Arena',            sub:'Comparativos' },
];

export function Nav({ page, setPage, lastUpdate, refetch }) {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <div className="nav-logo">G</div>
        <div>
          <div className="nav-title">GARRA</div>
          <div className="nav-sub">Sistema de Performance</div>
        </div>
      </div>

      <div className="nav-menu">
        {PAGES.map(p => (
          <button
            key={p.id}
            className={`nav-item ${page === p.id ? 'active' : ''}`}
            onClick={() => setPage(p.id)}
          >
            <span className="nav-icon">{p.icon}</span>
            <div className="nav-labels">
              <span className="nav-label">{p.label}</span>
              <span className="nav-sublabel">{p.sub}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="nav-footer">
        {lastUpdate && (
          <div className="nav-update">
            Atualizado {lastUpdate.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
          </div>
        )}
        <button className="nav-refresh" onClick={refetch}>↺ Recarregar</button>
      </div>
    </nav>
  );
}
