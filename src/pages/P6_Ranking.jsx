import { useMemo } from 'react';
import { consolidar, fmt } from '../utils/index';

const BADGES = {
  1: { img: '/logo-ouro.jpeg',   label: '🥇 1º Lugar', cls: 'pos-ouro'   },
  2: { img: '/logo-prata.jpeg',  label: '🥈 2º Lugar', cls: 'pos-prata'  },
  3: { img: '/logo-bronze.jpeg', label: '🥉 3º Lugar', cls: 'pos-bronze' },
};

function Podium({ titulo, itens, metricaLabel }) {
  const top3 = itens.slice(0, 3);
  const resto = itens.slice(3, 8);
  // Ordem do pódio: 2º, 1º, 3º (visual)
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="rank-section">
      <h3 className="rank-section-title">{titulo}</h3>

      <div className="podium-wrap">
        {podiumOrder.map((item, idx) => {
          const pos = item.pos;
          const badge = BADGES[pos];
          const isFirst = pos === 1;
          return (
            <div key={item.nome} className={`podium-item ${badge.cls} ${isFirst ? 'podium-first' : ''}`}>
              <img src={badge.img} alt={badge.label} className="podium-badge"/>
              <div className="podium-pos">{badge.label}</div>
              <div className="podium-nome" translate="no">{item.nome}</div>
              <div className="podium-val">{item.valor} <span className="podium-metric">{metricaLabel}</span></div>
              <div className={`podium-base podium-base-${pos}`}/>
            </div>
          );
        })}
      </div>

      {resto.length > 0 && (
        <div className="rank-list">
          {resto.map((item) => (
            <div key={item.nome} className="rank-list-row">
              <span className="rank-list-pos">{item.pos}º</span>
              <span className="rank-list-nome" translate="no">{item.nome}</span>
              <span className="rank-list-val">{item.valor} {metricaLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function P6_Ranking({ data }) {
  const { corretores } = data;

  const rankSupers = useMemo(() => {
    const map = {};
    corretores.forEach(c => {
      if (!map[c.superintendente]) map[c.superintendente] = [];
      map[c.superintendente].push(c);
    });
    return Object.entries(map)
      .map(([nome, lista]) => {
        const cons = consolidar(lista);
        return { nome, valor: cons.preVendas, sub: `${cons.ativos} corretores` };
      })
      .sort((a, b) => b.valor - a.valor)
      .map((item, i) => ({ ...item, pos: i + 1 }));
  }, [corretores]);

  const rankGerentes = useMemo(() => {
    const map = {};
    corretores.forEach(c => {
      if (!map[c.gerente]) map[c.gerente] = [];
      map[c.gerente].push(c);
    });
    return Object.entries(map)
      .map(([nome, lista]) => {
        const cons = consolidar(lista);
        return { nome, valor: cons.preVendas, sub: `${cons.ativos} corretores` };
      })
      .sort((a, b) => b.valor - a.valor)
      .map((item, i) => ({ ...item, pos: i + 1 }));
  }, [corretores]);

  const rankCorretores = useMemo(() => {
    return [...corretores]
      .sort((a, b) => b.preVendas - a.preVendas)
      .map((c, i) => ({
        nome: c.corretor, valor: c.preVendas,
        sub: c.gerente, pos: i + 1,
      }));
  }, [corretores]);

  const periodo = corretores[0] ? `${corretores[0].dataInicio} a ${corretores[0].dataFim}` : '';

  return (
    <div className="page ranking-page">
      {/* Header com troféu */}
      <div className="rank-header">
        <img src="/trophy.png" alt="Troféu" className="rank-trophy"/>
        <div>
          <h1 className="rank-title">HALL DA FAMA</h1>
          <div className="rank-periodo">{periodo}</div>
          <div className="rank-sub">Ranking por Pré-Vendas no período</div>
        </div>
        <img src="/trophy.png" alt="Troféu" className="rank-trophy rank-trophy-flip"/>
      </div>

      <Podium titulo="🏢 Superintendências" itens={rankSupers}   metricaLabel="PV"/>
      <Podium titulo="👥 Gerentes"           itens={rankGerentes} metricaLabel="PV"/>
      <Podium titulo="👤 Corretores"         itens={rankCorretores.slice(0,8)} metricaLabel="PV"/>
    </div>
  );
}
