import { useState, useEffect } from 'react';
import { useMetricas } from './hooks/useMetricas';
import { useControle } from './hooks/useControle';
import { usePhotos } from './hooks/usePhotos';
import { Nav } from './components/Nav';
import { P1_Diretoria }        from './pages/P1_Diretoria';
import { P2_Superintendencia } from './pages/P2_Superintendencia';
import { P3_Gerencia }         from './pages/P3_Gerencia';
import { P4_Corretor }         from './pages/P4_Corretor';
import { P5_Arena }            from './pages/P5_Arena';
import { P6_Ranking }          from './pages/P6_Ranking';
import './App.css';

const BADGE_IMGS = ['/logo-bronze.jpeg', '/logo-prata-bg.jpg', '/logo-ouro.jpeg'];

function LoadingScreen() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % 3), 700);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="loading-screen">
      <div className="loading-badge-wrap">
        {BADGE_IMGS.map((src, i) => (
          <img key={src} src={src} alt="" className={`loading-badge ${i===idx?'badge-active':''}`}/>
        ))}
      </div>
      <div className="loading-text">Carregando dados do Sistema GARRA...</div>
      <div className="loading-bar"><div className="loading-bar-fill"/></div>
    </div>
  );
}

function ErrorScreen({ error, refetch }) {
  return (
    <div className="error-screen">
      <div style={{fontSize:40}}>⚠️</div>
      <h2>Não foi possível acessar a planilha</h2>
      <div className="error-card">
        <p><strong>Para resolver:</strong></p>
        <ol>
          <li>Abra a planilha no Google Sheets</li>
          <li>Arquivo → Compartilhar → Publicar na web</li>
          <li>Selecione a aba <strong>Métricas_período</strong> → Publicar</li>
          <li>Clique em Tentar novamente</li>
        </ol>
      </div>
      <pre className="error-detail">{error}</pre>
      <button className="btn-primary" onClick={refetch}>↺ Tentar novamente</button>
    </div>
  );
}

export default function App() {
  const { data, loading, error, refetch, lastUpdate } = useMetricas();
  const { controle } = useControle();
  const { getPhoto, savePhoto } = usePhotos();
  const [page, setPage]   = useState('diretoria');
  const [target, setTarget] = useState(null);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (loading) return <LoadingScreen/>;
  if (error)   return <ErrorScreen error={error} refetch={refetch}/>;

  const renderPage = () => {
    switch(page) {
      case 'diretoria': return <P1_Diretoria data={data} setPage={setPage} setTarget={setTarget}/>;
      case 'super':     return <P2_Superintendencia data={data} target={target} setTarget={setTarget} setPage={setPage}/>;
      case 'gerencia':  return <P3_Gerencia data={data} controle={controle} target={target} setTarget={setTarget} setPage={setPage}/>;
      case 'corretor':  return <P4_Corretor data={data} controle={controle} target={target} setPage={setPage} media={data.media} getPhoto={getPhoto}/>;
      case 'arena':     return <P5_Arena data={data}/>;
      case 'ranking':   return <P6_Ranking data={data}/>;
      default:          return <P1_Diretoria data={data} setPage={setPage} setTarget={setTarget}/>;
    }
  };

  return (
    <div className="layout">
      <div className="watermark" aria-hidden="true">
        <img src="/logo-prata-bg.jpg" alt=""/>
      </div>
      <Nav page={page} setPage={(p)=>{setPage(p);setTarget(null);}}
           lastUpdate={lastUpdate} refetch={refetch}
           theme={theme} setTheme={setTheme}/>
      <div className="content">{renderPage()}</div>
    </div>
  );
}
