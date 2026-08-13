import { useState } from 'react';
import { fmt, classificarCorretor } from '../utils/format';

const COLUNAS = [
  { key: 'posicao', label: '#', sort: null },
  { key: 'corretor', label: 'Corretor', sort: 'corretor' },
  { key: 'gerente', label: 'Gerente', sort: 'gerente' },
  { key: 'diasTrabalhados', label: 'Dias', sort: 'diasTrabalhados' },
  { key: 'leads', label: 'Leads', sort: 'leads' },
  { key: 'agendForm2', label: 'Agend.', sort: 'agendForm2' },
  { key: 'visitasForm3', label: 'Visitas', sort: 'visitasForm3' },
  { key: 'preVendas', label: 'Pré-Venda', sort: 'preVendas' },
  { key: 'taxaLeadAgend', label: 'Tx Lead→Ag', sort: 'taxaLeadAgend' },
  { key: 'taxaAgendVisita', label: 'Tx Ag→Vis', sort: 'taxaAgendVisita' },
  { key: 'taxaVisitaConv', label: 'Tx Conv', sort: 'taxaVisitaConv' },
  { key: 'engaj', label: 'Engaj.', sort: 'antes20h' },
  { key: 'status', label: 'Status', sort: null },
];

function Cell({ col, c, media, rank }) {
  switch (col.key) {
    case 'posicao': return <td className="td-rank">{rank}</td>;
    case 'corretor': return <td className="td-nome">{c.corretor}</td>;
    case 'gerente': return <td className="td-sub">{c.gerente}</td>;
    case 'diasTrabalhados': return <td>{c.diasTrabalhados}</td>;
    case 'leads': return <td className={c.leads > media.leads ? 'val-up' : ''}>{c.leads}</td>;
    case 'agendForm2': return <td className={c.agendForm2 > media.agendForm2 ? 'val-up' : ''}>{c.agendForm2}</td>;
    case 'visitasForm3': return <td className={c.visitasForm3 > media.visitasForm3 ? 'val-up' : ''}>{c.visitasForm3}</td>;
    case 'preVendas': return <td className={c.preVendas > 0 ? 'val-gold' : ''}>{c.preVendas}</td>;
    case 'taxaLeadAgend': return <td>{fmt.pct(c.taxaLeadAgend)}</td>;
    case 'taxaAgendVisita': return <td>{fmt.pct(c.taxaAgendVisita)}</td>;
    case 'taxaVisitaConv': return <td>{fmt.pct(c.taxaVisitaConv)}</td>;
    case 'engaj': {
      const engaj = c.diasTrabalhados > 0
        ? (c.antes20h + c.ate00h) / c.diasTrabalhados
        : 0;
      return <td><div className="mini-bar-wrap"><div className="mini-bar" style={{ width: `${Math.min(100, engaj * 100)}%` }} /></div></td>;
    }
    case 'status': {
      const cls = classificarCorretor(c);
      return <td><span className="badge" style={{ color: cls.color, background: cls.bg }}>{cls.label}</span></td>;
    }
    default: return <td>-</td>;
  }
}

export function RankingTable({ data, filtro, onSelectCorretor }) {
  const [sortBy, setSortBy] = useState('preVendas');
  const [sortDir, setSortDir] = useState(-1);

  const { corretores, media } = data;

  const filtrados = corretores.filter(c => {
    if (filtro.super && c.superintendente !== filtro.super) return false;
    if (filtro.gerente && c.gerente !== filtro.gerente) return false;
    return true;
  });

  const sorted = [...filtrados].sort((a, b) => {
    const av = a[sortBy] ?? 0;
    const bv = b[sortBy] ?? 0;
    if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
    return (av - bv) * sortDir;
  });

  function handleSort(key) {
    if (!key) return;
    if (sortBy === key) setSortDir(d => -d);
    else { setSortBy(key); setSortDir(-1); }
  }

  return (
    <div className="card ranking-card">
      <h3 className="card-title">🏅 Ranking de Corretores
        <span className="card-sub">{sorted.length} exibidos</span>
      </h3>
      <div className="table-wrap">
        <table className="ranking-table">
          <thead>
            <tr>
              {COLUNAS.map(col => (
                <th
                  key={col.key}
                  className={col.sort ? 'sortable' : ''}
                  onClick={() => handleSort(col.sort)}
                >
                  {col.label}
                  {sortBy === col.sort && <span>{sortDir === -1 ? ' ↓' : ' ↑'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr key={c.corretor} className="ranking-row" onClick={() => onSelectCorretor(c)}>
                {COLUNAS.map(col => (
                  <Cell key={col.key} col={col} c={c} media={media} rank={i + 1} />
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={COLUNAS.length} className="empty-row">Nenhum corretor encontrado com os filtros selecionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
