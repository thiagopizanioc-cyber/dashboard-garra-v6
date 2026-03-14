import { useState } from 'react';
import { useMetricas } from './hooks/useMetricas';
import { useControle } from './hooks/useControle';
import { Nav } from './components/Nav';
import { P1_Diretoria }        from './pages/P1_Diretoria';
import { P2_Superintendencia } from './pages/P2_Superintendencia';
import { P3_Gerencia }         from './pages/P3_Gerencia';
import { P4_Corretor }         from './pages/P4_Corretor';
import { P5_Arena }            from './pages/P5_Arena';
import './App.css';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">G</div>
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
  const [page, setPage]     = useState('diretoria');
  const [target, setTarget] = useState(null);

  if (loading) return <LoadingScreen/>;
  if (error)   return <ErrorScreen error={error} refetch={refetch}/>;

  const renderPage = () => {
    switch(page) {
      case 'diretoria': return <P1_Diretoria data={data} setPage={setPage} setTarget={setTarget}/>;
      case 'super':     return <P2_Superintendencia data={data} target={target} setTarget={setTarget} setPage={setPage}/>;
      case 'gerencia':  return <P3_Gerencia data={data} controle={controle} target={target} setTarget={setTarget} setPage={setPage}/>;
      case 'corretor':  return <P4_Corretor data={data} controle={controle} target={target} setPage={setPage}/>;
      case 'arena':     return <P5_Arena data={data}/>;
      default:          return <P1_Diretoria data={data} setPage={setPage} setTarget={setTarget}/>;
    }
  };

  return (
    <div className="layout">
      <Nav page={page} setPage={(p)=>{setPage(p);setTarget(null);}} lastUpdate={lastUpdate} refetch={refetch}/>
      <div className="content">{renderPage()}</div>
    </div>
  );
}
