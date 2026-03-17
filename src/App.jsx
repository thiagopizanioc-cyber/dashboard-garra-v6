import { useState, useEffect, useMemo } from 'react';
import { useRawData } from './hooks/useRawData';
import { usePhotos } from './hooks/usePhotos';
import { useVendasExternas, verificarRastreabilidade } from './hooks/useVendasExternas';
import { calcularData, calcularPeriodoAnterior } from './utils/calcEngine';
import { Nav } from './components/Nav';
import { DateRangePicker } from './components/DateRangePicker';
import { P1_Diretoria }        from './pages/P1_Diretoria';
import { P2_Superintendencia } from './pages/P2_Superintendencia';
import { P3_Gerencia }         from './pages/P3_Gerencia';
import { P4_Corretor }         from './pages/P4_Corretor';
import { P5_Arena }            from './pages/P5_Arena';
import { P6_Ranking }          from './pages/P6_Ranking';
import './App.css';

const BADGE_IMGS = ['/logo-bronze.jpeg', '/logo-prata-bg.jpg', '/logo-ouro.jpeg'];

function LoadingScreen({ msg }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i+1)%3), 700);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="loading-screen">
      <div className="loading-badge-wrap">
        {BADGE_IMGS.map((src,i) => (
          <img key={src} src={src} alt=""
            className={`loading-badge ${i===idx?'badge-active':''}`}/>
        ))}
      </div>
      <div className="loading-text">{msg||'Carregando dados do Sistema GARRA...'}</div>
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
          <li>Publique a planilha inteira (ou cada aba necessária)</li>
          <li>Clique em Tentar novamente</li>
        </ol>
      </div>
      <pre className="error-detail">{error}</pre>
      <button className="btn-primary" onClick={refetch}>↺ Tentar novamente</button>
    </div>
  );
}

// Detecta o último período registrado no CONTROLE_DIARIO
function detectarPeriodoInicial(raw) {
  if (!raw?.controle?.length) {
    const f = new Date(); f.setHours(0,0,0,0);
    const i = new Date(f); i.setDate(f.getDate()-27);
    return { ini: i, fim: f };
  }
  const datas = raw.controle.map(r => r.data).filter(Boolean).sort((a,b) => b-a);
  const fim = new Date(datas[0]); fim.setHours(0,0,0,0);
  // Tenta detectar o período real lendo a data mais antiga com a mesma equipe
  const ini = new Date(fim); ini.setDate(fim.getDate()-27);
  return { ini, fim };
}

export default function App() {
  const { raw, loading, error, refetch, lastUpdate } = useRawData();
  const { getPhoto, savePhoto } = usePhotos();
  const { vendas, loading: loadVendas, error: errVendas, lastFetch: lastVendas,
          fetchVendas } = useVendasExternas();

  const [page, setPage]     = useState('diretoria');
  const [target, setTarget] = useState(null);
  const [theme, setTheme]   = useState('light');
  const [calculating, setCalculating] = useState(false);

  // Período selecionado
  const [periodo, setPeriodo] = useState(null);

  // Inicializa período assim que os dados chegam
  useEffect(() => {
    if (raw && !periodo) {
      setPeriodo(detectarPeriodoInicial(raw));
    }
  }, [raw, periodo]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Calcula os dados do período selecionado
  const data = useMemo(() => {
    if (!raw || !periodo) return null;
    return calcularData(raw, periodo.ini, periodo.fim);
  }, [raw, periodo]);

  // Calcula período anterior automaticamente
  const dataPeriodoAnterior = useMemo(() => {
    if (!raw || !periodo) return null;
    const ant = calcularPeriodoAnterior(periodo.ini, periodo.fim);
    return calcularData(raw, ant.ini, ant.fim);
  }, [raw, periodo]);

  // Controle diário para padrões de folga
  const controle = useMemo(() => {
    if (!raw?.controle) return null;
    const porCorretor = {};
    const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    raw.controle.forEach(r => {
      if (!porCorretor[r.corretor]) {
        porCorretor[r.corretor] = { folgasPorDia:[0,0,0,0,0,0,0], totalFolgas:0, folgasDatas:[], padroes:[], alerta:false };
      }
      const c = porCorretor[r.corretor];
      if (r.status.toLowerCase().includes('folga')) {
        c.totalFolgas++;
        c.folgasPorDia[r.data.getDay()]++;
        c.folgasDatas.push(r.data);
      }
    });
    Object.values(porCorretor).forEach(c => {
      const p = [];
      c.folgasPorDia.forEach((qtd,dia) => { if(qtd>=2) p.push(`Folga recorrente ${DIAS[dia]} (${qtd}x)`); });
      const datas = [...c.folgasDatas].sort((a,b)=>a-b);
      let maxC=0,cur=1;
      for(let i=1;i<datas.length;i++){
        const diff=(datas[i]-datas[i-1])/86400000;
        if(diff===1){cur++;maxC=Math.max(maxC,cur);}else cur=1;
      }
      if(maxC>=2) p.push(`${maxC} folgas consecutivas`);
      if(c.totalFolgas>5) p.push(`${c.totalFolgas} folgas no período`);
      c.padroes=p;
      c.alerta=c.totalFolgas>5||maxC>=2||c.folgasPorDia.some(x=>x>=2);
    });
    return porCorretor;
  }, [raw]);

  // Alertas de rastreabilidade: venda no Power BI sem Form preenchido
  const alertasRastreabilidade = useMemo(() => {
    return verificarRastreabilidade(vendas, raw);
  }, [vendas, raw]);

  const vendasProps = { vendas, loadVendas, errVendas, lastVendas, fetchVendas,
                        alertasRastreabilidade };

  function handlePeriodoChange(ini, fim) {
    setCalculating(true);
    setTimeout(() => {
      setPeriodo({ ini, fim });
      setCalculating(false);
    }, 50);
  }

  if (loading) return <LoadingScreen msg="Carregando dados brutos da planilha..."/>;
  if (error)   return <ErrorScreen error={error} refetch={refetch}/>;
  if (!data)   return <LoadingScreen msg="Calculando métricas do período..."/>;

  const renderPage = () => {
    const props = { data, controle, target, setTarget, setPage, getPhoto, savePhoto,
                    dataPeriodoAnterior, ...vendasProps };
    switch(page) {
      case 'diretoria': return <P1_Diretoria {...props}/>;
      case 'super':     return <P2_Superintendencia {...props}/>;
      case 'gerencia':  return <P3_Gerencia {...props}/>;
      case 'corretor':  return <P4_Corretor {...props} media={data.media}/>;
      case 'arena':     return <P5_Arena data={data}/>;
      case 'ranking':   return <P6_Ranking data={data} getPhoto={getPhoto} savePhoto={savePhoto}/>;
      default:          return <P1_Diretoria {...props}/>;
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
      <div className="content">
        {/* Barra de período — visível em todas as páginas */}
        <div className="periodo-bar">
          <DateRangePicker
            raw={raw}
            ini={periodo?.ini} fim={periodo?.fim}
            onChange={handlePeriodoChange}
            calculating={calculating}/>
          {periodo && (
            <div className="periodo-info">
              <span className="periodo-label">
                {periodo.ini.toLocaleDateString('pt-BR')} →&nbsp;
                {periodo.fim.toLocaleDateString('pt-BR')}
              </span>
              <span className="periodo-dias">
                {Math.round((periodo.fim - periodo.ini)/86400000)+1} dias
              </span>
              {dataPeriodoAnterior && (
                <span className="periodo-ant">
                  ↩ comparando com período anterior
                </span>
              )}
            </div>
          )}
        </div>
        {calculating
          ? <div className="calc-overlay">⏳ Calculando métricas...</div>
          : renderPage()}
      </div>
    </div>
  );
}
