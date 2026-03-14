import { useState } from 'react';
import { useSheetData } from './hooks/useSheetData';
import { KpiRow } from './components/KpiRow';
import { FunilConversao } from './components/FunilConversao';
import { RankingTable } from './components/RankingTable';
import { CorretorModal } from './components/CorretorModal';
import { Filtros } from './components/Filtros';
import './App.css';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">G</div>
      <div className="loading-text">Carregando dados da equipe...</div>
      <div className="loading-bar"><div className="loading-bar-fill" /></div>
    </div>
  );
}

function ErrorScreen({ error, refetch }) {
  return (
    <div className="error-screen">
      <div className="error-icon">⚠️</div>
      <h2>Não foi possível acessar a planilha</h2>
      <div className="error-steps">
        <p>Para resolver, siga os passos:</p>
        <ol>
          <li>Abra a planilha no Google Sheets</li>
          <li>Vá em <strong>Arquivo → Compartilhar → Publicar na web</strong></li>
          <li>Selecione a aba <strong>Métricas_período</strong> e clique em <strong>Publicar</strong></li>
          <li>Volte aqui e clique em <strong>Tentar novamente</strong></li>
        </ol>
      </div>
      <pre className="error-detail">{error}</pre>
      <button className="btn-retry" onClick={refetch}>↺ Tentar novamente</button>
    </div>
  );
}

function SuperCard({ data, filtro }) {
  const { corretores } = data;
  const grupos = {};
  corretores.forEach(c => {
    if (filtro.super && c.superintendente !== filtro.super) return;
    if (!grupos[c.superintendente]) grupos[c.superintendente] = { ativos: 0, total: 0, agend: 0, visitas: 0, preVendas: 0 };
    grupos[c.superintendente].total++;
    if (c.diasTrabalhados > 0) grupos[c.superintendente].ativos++;
    grupos[c.superintendente].agend += c.agendForm2;
    grupos[c.superintendente].visitas += c.visitasForm3;
    grupos[c.superintendente].preVendas += c.preVendas;
  });
  return (
    <div className="card super-card">
      <h3 className="card-title">🏢 Por Superintendência</h3>
      {Object.entries(grupos).map(([nome, g]) => (
        <div key={nome} className="super-row">
          <div className="super-nome">{nome || '—'}</div>
          <div className="super-stats">
            <span title="Corretores ativos/total">👥 {g.ativos}/{g.total}</span>
            <span title="Agendamentos">📅 {g.agend}</span>
            <span title="Visitas">🏠 {g.visitas}</span>
            <span title="Pré-Vendas" className={g.preVendas > 0 ? 'val-gold' : ''}>🏆 {g.preVendas}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { data, loading, error, refetch, lastUpdate } = useSheetData();
  const [filtro, setFiltro] = useState({ super: null, gerente: null });
  const [corretorSelecionado, setCorretorSelecionado] = useState(null);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} refetch={refetch} />;

  const c0 = data.corretores[0];
  const periodo = c0 ? `${c0.dataInicio} – ${c0.dataFim}` : '';

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">G</div>
          <div>
            <div className="header-title">SISTEMA GARRA</div>
            <div className="header-sub">Dashboard de Performance · Equipe Comercial</div>
          </div>
        </div>
        <div className="header-right">
          {periodo && <div className="header-periodo">📅 {periodo}</div>}
          {lastUpdate && (
            <div className="header-update">
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <button className="btn-refresh" onClick={refetch} title="Recarregar dados">↺</button>
        </div>
      </header>
      <main className="app-main">
        <KpiRow data={data} />
        <Filtros data={data} filtro={filtro} setFiltro={setFiltro} />
        <div className="row-2col">
          <FunilConversao data={data} filtro={filtro} />
          <SuperCard data={data} filtro={filtro} />
        </div>
        <RankingTable data={data} filtro={filtro} onSelectCorretor={setCorretorSelecionado} />
      </main>
      {corretorSelecionado && (
        <CorretorModal
          corretor={corretorSelecionado}
          media={data.media}
          onClose={() => setCorretorSelecionado(null)}
        />
      )}
    </div>
  );
}
