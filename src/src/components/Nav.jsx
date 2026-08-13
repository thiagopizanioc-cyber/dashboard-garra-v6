import { useState, useEffect } from 'react';

const PAGES = [
  { id:'diretoria', icon:'🏛️', label:'Diretoria',        sub:'Visão macro' },
  { id:'super',     icon:'🏢', label:'Superintendência',  sub:'Por equipe' },
  { id:'gerencia',  icon:'👥', label:'Gerência',          sub:'Por célula' },
  { id:'corretor',  icon:'👤', label:'Corretor',          sub:'Perfil individual' },
  { id:'arena',     icon:'⚡', label:'Arena',             sub:'Comparativos' },
  { id:'ranking',   icon:'🏆', label:'Ranking',           sub:'Hall da fama' },
];

export function Nav({ page, setPage, lastUpdate, refetch, theme, setTheme }) {
  const [open, setOpen] = useState(false);

  function navTo(id) { setPage(id); setOpen(false); }

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (!e.target.closest('.nav') && !e.target.closest('.nav-hamburger')) setOpen(false);
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, [open]);

  const currentPage = PAGES.find(p => p.id === page);

  return (
    <>
      <div className="topbar">
        <div className="topbar-brand">
          <img src="/logo-ouro.jpeg" className="nav-logo-img" alt="GARRA"/>
          <div>
            <div className="nav-title">GARRA</div>
            {currentPage && <div className="topbar-page">{currentPage.icon} {currentPage.label}</div>}
          </div>
        </div>
        <div className="topbar-right">
          <button className="topbar-btn" onClick={() => setTheme(t => t==='dark'?'light':'dark')} title="Tema">
            {theme==='dark' ? '☀️' : '🌙'}
          </button>
          <button className="topbar-btn" onClick={refetch} title="Recarregar">↺</button>
          <button className="nav-hamburger topbar-btn" onClick={() => setOpen(o => !o)} aria-label="Menu">
            <span className={`ham-line ${open?'open':''}`}/>
            <span className={`ham-line ${open?'open':''}`}/>
            <span className={`ham-line ${open?'open':''}`}/>
          </button>
        </div>
      </div>

      {open && <div className="nav-overlay" onClick={() => setOpen(false)}/>}

      <nav className={`nav ${open?'nav-open':''}`}>
        <div className="nav-brand">
          <img src="/logo-ouro.jpeg" className="nav-logo-img" alt="GARRA"/>
          <div>
            <div className="nav-title">GARRA</div>
            <div className="nav-sub">Sistema de Performance</div>
          </div>
        </div>

        <div className="nav-menu">
          {PAGES.map(p => (
            <button key={p.id} className={`nav-item ${page===p.id?'active':''}`} onClick={() => navTo(p.id)}>
              <span className="nav-icon">{p.icon}</span>
              <div className="nav-labels">
                <span className="nav-label">{p.label}</span>
                <span className="nav-sublabel">{p.sub}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="nav-footer">
          <button className="nav-theme-btn" onClick={() => setTheme(t => t==='dark'?'light':'dark')}>
            {theme==='dark' ? '☀️ Tema claro' : '🌙 Tema escuro'}
          </button>
          {lastUpdate && <div className="nav-update">Atualizado {lastUpdate.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>}
          <button className="nav-refresh" onClick={() => { refetch(); setOpen(false); }}>↺ Recarregar</button>
        </div>
      </nav>
    </>
  );
}
