import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { csvUrl, GID_METRICAS } from '../config';

function n(v) {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace('%','').replace(',','.').trim();
  const x = parseFloat(s); return isNaN(x) ? 0 : x;
}
function pct(v) {
  const s = String(v ?? '').replace(',','.').trim();
  if (s.endsWith('%')) return parseFloat(s)/100;
  const x = parseFloat(s); if (isNaN(x)) return 0;
  return x > 1 ? x/100 : x;
}

function mapRow(r) {
  return {
    superintendente: String(r[4]||'').trim().toUpperCase(),
    gerente:         String(r[5]||'').trim().toUpperCase(),
    corretor:        String(r[6]||'').trim().toUpperCase(),
    dataInicio:      String(r[1]||''), dataFim: String(r[2]||''),
    periodo:         n(r[3]),
    diasTrabalhados: n(r[7]),  folgas:    n(r[8]),
    antes20h:        n(r[9]),  ate00h:    n(r[10]),
    retroativo:      n(r[11]), streak:    n(r[12]),
    leads:           n(r[13]), tempoDiscador: n(r[14]), repiks: n(r[15]),
    agendForm1:      n(r[16]), agendForm2: n(r[17]), divAgend: n(r[18]),
    visitasForm1:    n(r[19]), visitasForm3: n(r[20]), divVisitas: n(r[21]),
    propostas:       n(r[22]), preVendas:  n(r[23]),
    noShow:          pct(r[24]), taxaLeadAgend: pct(r[25]),
    taxaAgendVisita: pct(r[26]), taxaVisitaConv: pct(r[27]),
    visitasComGerente: n(r[28]), taxaPartGerente: pct(r[29]), taxaConvGerente: pct(r[30]),
    canaisAg: {
      'Google ADS': pct(r[31]), 'Facebook FC': pct(r[32]), 'RD Gold': pct(r[33]),
      'Facebook RD': pct(r[34]), 'Canal Investidor': pct(r[35]), 'Carteira': pct(r[36]),
      'Relâmpago ll': pct(r[37]), 'Canal Elite': pct(r[38]), 'Telefone': pct(r[39]),
      'Prom. Relâmpago': pct(r[40]), 'Discador 01': pct(r[41]), 'Outros': pct(r[42]),
    },
    canaisVs: {
      'Google ADS': pct(r[43]), 'Facebook FC': pct(r[44]), 'RD Gold': pct(r[45]),
      'Facebook RD': pct(r[46]), 'Canal Investidor': pct(r[47]), 'Carteira': pct(r[48]),
      'Relâmpago ll': pct(r[49]), 'Canal Elite': pct(r[50]), 'Telefone': pct(r[51]),
      'Prom. Relâmpago': pct(r[52]), 'Discador 01': pct(r[53]), 'Outros': pct(r[54]),
    },
    sicaqQtd: n(r[56]), sicaqPerc: pct(r[57]),
    agendaPeriodo: n(r[59]),
  };
}

export function useMetricas() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(csvUrl(GID_METRICAS));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();
      const { data: rows } = Papa.parse(txt, { skipEmptyLines: true });
      if (rows.length < 3) throw new Error('Dados insuficientes na planilha.');

      const media      = mapRow(rows[1]);
      const corretores = rows.slice(2)
        .filter(r => r[6] && String(r[6]).trim())
        .map(mapRow);

      const supers   = [...new Set(corretores.map(c=>c.superintendente))].filter(Boolean).sort();
      const gerentes = [...new Set(corretores.map(c=>c.gerente))].filter(Boolean).sort();
      setData({ media, corretores, supers, gerentes });
      setLastUpdate(new Date());
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(()=>{ fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_, lastUpdate };
}
