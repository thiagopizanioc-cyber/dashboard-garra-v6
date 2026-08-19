/**
 * ScorePanel.jsx — Anel de pontuação clicável + decomposição + legenda.
 *
 * Substitui o <ScoreRing score={st.score}/> na página do Corretor.
 * Estilos inline de propósito: não exige nenhuma alteração no App.css.
 */
import { useState } from 'react';
import { statusCorretor, SCORE_CFG } from '../utils/scoreConfig';

const S = {
  wrap:    { position:'relative', display:'inline-block' },
  btn:     { background:'none', border:'none', padding:0, cursor:'pointer', lineHeight:0 },
  pop:     { position:'absolute', top:'80px', left:0, zIndex:50, width:'330px',
             background:'#11161f', border:'1px solid rgba(255,255,255,0.12)',
             borderRadius:'10px', padding:'14px', boxShadow:'0 12px 32px rgba(0,0,0,0.5)',
             textAlign:'left' },
  head:    { display:'flex', justifyContent:'space-between', alignItems:'center',
             marginBottom:'10px' },
  title:   { fontSize:'12px', fontWeight:700, letterSpacing:'0.04em', color:'#e5e7eb' },
  close:   { background:'none', border:'none', color:'#94a3b8', cursor:'pointer',
             fontSize:'16px', lineHeight:1 },
  row:     { padding:'7px 0', borderTop:'1px solid rgba(255,255,255,0.06)' },
  rowTop:  { display:'flex', justifyContent:'space-between', alignItems:'baseline' },
  label:   { fontSize:'12px', fontWeight:600, color:'#e5e7eb' },
  pts:     { fontSize:'12px', fontWeight:700, color:'#f59e0b', fontVariantNumeric:'tabular-nums' },
  val:     { fontSize:'11px', color:'#cbd5e1', marginTop:'2px' },
  ref:     { fontSize:'10px', color:'#7c8899', marginTop:'1px' },
  bar:     { height:'4px', borderRadius:'2px', background:'rgba(255,255,255,0.07)',
             marginTop:'5px', overflow:'hidden' },
  pen:     { fontSize:'11px', color:'#f87171', display:'flex',
             justifyContent:'space-between', padding:'6px 0' },
  total:   { display:'flex', justifyContent:'space-between', marginTop:'8px',
             paddingTop:'8px', borderTop:'1px solid rgba(255,255,255,0.14)',
             fontSize:'13px', fontWeight:700, color:'#e5e7eb' },
  aviso:   { fontSize:'10px', color:'#fbbf24', marginTop:'8px', lineHeight:1.4 },
  legenda: { fontSize:'10px', color:'#7c8899', marginTop:'8px', lineHeight:1.5 },
};

export function ScorePanel({ corretor, referencia }) {
  const [aberto, setAberto] = useState(false);
  const st = statusCorretor(corretor, referencia);

  const score = st.score;
  const cor = st.color;
  const r = 28, circ = 2 * Math.PI * r;
  const dash = ((score ?? 0) / 100) * circ;

  return (
    <div style={S.wrap}>
      <button style={S.btn} onClick={() => setAberto(v => !v)}
              title="Ver como esta pontuação foi calculada">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
          {score !== null && (
            <circle cx="36" cy="36" r={r} fill="none" stroke={cor} strokeWidth="5"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              transform="rotate(-90 36 36)"/>
          )}
          <text x="36" y="41" textAnchor="middle" fill={cor}
            style={{fontSize:'14px', fontWeight:600, fontFamily:'inherit'}}>
            {score === null ? '—' : score}
          </text>
        </svg>
        <div style={{fontSize:'9px', color:cor, marginTop:'-6px', fontWeight:600}}>
          {st.label}
        </div>
      </button>

      {aberto && (
        <div style={S.pop}>
          <div style={S.head}>
            <span style={S.title}>COMO ESTE NÚMERO É CALCULADO</span>
            <button style={S.close} onClick={() => setAberto(false)}>✕</button>
          </div>

          {st.naoIniciado ? (
            <div style={S.val}>
              {st.motivo}. A régua só liga quando a superintendência começa a
              preencher — até lá o corretor não recebe nota nem selo.
            </div>
          ) : (
            <>
              {st.componentes.map(c => (
                <div key={c.chave} style={S.row}>
                  <div style={S.rowTop}>
                    <span style={S.label}>
                      {c.label} <span style={{color:'#7c8899', fontWeight:400}}>
                        {Math.round(c.pesoEfetivo * 100)}%
                      </span>
                    </span>
                    <span style={S.pts}>
                      {c.semRegua ? 'sem régua' : `${c.pontos.toFixed(1)} pts`}
                    </span>
                  </div>
                  <div style={S.val}>{c.valor}</div>
                  <div style={S.ref}>{c.refTxt}</div>
                  {!c.semRegua && (
                    <div style={S.bar}>
                      <div style={{width:`${(c.pct*100).toFixed(0)}%`, height:'100%',
                                   background:cor, borderRadius:'2px'}}/>
                    </div>
                  )}
                </div>
              ))}

              {st.penalidades.map((p, i) => (
                <div key={i} style={S.pen}>
                  <span>⚠ {p.label}</span><span>{p.pontos} pts</span>
                </div>
              ))}

              <div style={S.total}>
                <span>TOTAL</span><span style={{color:cor}}>{score} · {st.label}</span>
              </div>

              {st.provisorio && (
                <div style={S.aviso}>
                  ⚠ Régua provisória: só {referencia?.n ?? 0} corretor(es) com
                  {' '}{SCORE_CFG.referencia.minDiasParaEntrar}+ dias no período
                  (mínimo {SCORE_CFG.referencia.minCorretores}). O selo de faixa
                  fica suspenso até a base crescer.
                </div>
              )}

              <div style={S.legenda}>
                A nota mede <b>processo</b> (estar presente, preencher, agendar) —
                não venda. Atividade e Agendamento são comparados com a{' '}
                <b>mediana do time no período</b>
                {referencia?.n ? ` (${referencia.n} corretores na régua)` : ''};
                atingir {SCORE_CFG.referencia.fatorTeto * 100}% da mediana já dá
                o máximo do componente. Preenchimento após as 20h <b>não perde
                ponto</b>. Faixas: {SCORE_CFG.faixas.destaque}+ Destaque ·{' '}
                {SCORE_CFG.faixas.regular}–{SCORE_CFG.faixas.destaque - 1} Regular ·
                abaixo Atenção.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
