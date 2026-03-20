import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { csvUrl, GID_CONTROLE } from '../config';

const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function useControle() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    if (!GID_CONTROLE) { setLoading(false); return; }
    (async()=>{
      try {
        const res = await fetch(csvUrl(GID_CONTROLE));
        const txt = await res.text();
        const { data: rows } = Papa.parse(txt, { skipEmptyLines: true });
        // Linha 0 = cabeçalho
        // Cols: Data, Corretor, Gerente, Superintendente, Status, ...
        const registros = rows.slice(1).map(r => ({
          data:    parseDate(r[0]),
          corretor: String(r[1]||'').trim().toUpperCase(),
          gerente:  String(r[2]||'').trim().toUpperCase(),
          super_:   String(r[3]||'').trim().toUpperCase(),
          status:   String(r[4]||'').trim().toLowerCase(),
        })).filter(r => r.data && r.corretor);

        // Por corretor, contar folgas por dia da semana
        const porCorretor = {};
        registros.forEach(r => {
          if (!porCorretor[r.corretor]) porCorretor[r.corretor] = {
            folgasPorDia: [0,0,0,0,0,0,0],
            totalDias: 0, totalFolgas: 0,
            folgasConsecutivas: 0, folgasUltimas: [],
          };
          const c = porCorretor[r.corretor];
          c.totalDias++;
          const isFolga = r.status.includes('folga');
          if (isFolga) {
            c.totalFolgas++;
            c.folgasPorDia[r.data.getDay()]++;
            c.folgasUltimas.push(r.data);
          }
        });

        // Detectar padrões
        Object.keys(porCorretor).forEach(nome => {
          const c = porCorretor[nome];
          const padroes = [];

          // Dia recorrente (>= 2 vezes no mesmo dia da semana)
          c.folgasPorDia.forEach((qtd, dia) => {
            if (qtd >= 2) padroes.push(`Folga recorrente ${DIAS[dia]} (${qtd}x)`);
          });

          // Folgas consecutivas
          const datas = [...c.folgasUltimas].sort((a,b)=>a-b);
          let maxConsec = 0, curConsec = 1;
          for (let i=1; i<datas.length; i++) {
            const diff = (datas[i]-datas[i-1])/(1000*60*60*24);
            if (diff === 1) { curConsec++; maxConsec = Math.max(maxConsec, curConsec); }
            else curConsec = 1;
          }
          if (maxConsec >= 2) padroes.push(`${maxConsec} folgas consecutivas`);

          // > 5 folgas no período
          if (c.totalFolgas > 5) padroes.push(`${c.totalFolgas} folgas no período`);

          c.padroes = padroes;
          c.alerta = c.totalFolgas > 5 || maxConsec >= 2 || c.folgasPorDia.some(x=>x>=2);
        });

        setData(porCorretor);
      } catch(_) { setData(null); }
      setLoading(false);
    })();
  }, []);

  return { controle: data, controleLoading: loading };
}
