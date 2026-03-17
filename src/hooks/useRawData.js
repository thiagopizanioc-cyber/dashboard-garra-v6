/**
 * useRawData — lê as 4 abas brutas em paralelo e armazena em cache.
 * Não faz nenhum cálculo. Só busca e parseia.
 */
import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { csvUrl, GID } from '../config';

async function fetchCSV(gid) {
  const res = await fetch(csvUrl(gid));
  if (!res.ok) throw new Error(`HTTP ${res.status} na aba GID ${gid}`);
  const txt = await res.text();
  const { data } = Papa.parse(txt, { skipEmptyLines: true });
  return data; // array de arrays, linha 0 = cabeçalho
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function useRawData() {
  const [raw, setRaw]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Busca todas as abas em paralelo
      const [rF1, rF2, rF3, rCtrl, rCad] = await Promise.all([
        fetchCSV(GID.FORM1),
        fetchCSV(GID.FORM2),
        fetchCSV(GID.FORM3),
        fetchCSV(GID.CONTROLE),
        fetchCSV(GID.CADASTRO),
      ]);

      // --- FORM 1 (DADOS_FORM_REGISTRO) ---
      // Col: A=timestamp, B=dataTrabalho, C=corretor, D=discador,
      //      E=leads, F=agendDeclared, G=visitasDeclared, J=repiks
      const form1 = rF1.slice(1).map(r => ({
        timestamp:   parseDate(r[0]),
        data:        parseDate(r[1]),
        corretor:    String(r[2]||'').toUpperCase().trim(),
        discador:    String(r[3]||''),
        leads:       Number(r[4])||0,
        agendForm1:  Number(r[5])||0,
        visitasForm1:Number(r[6])||0,
        repiks:      Number(r[9])||0,
      })).filter(r => r.data && r.corretor);

      // --- FORM 2 (Form_Clientes_agendados) ---
      // Col: A=timestamp, B=dataInput, C=corretor, D=cliente,
      //      E=canal, F=dataVisita, H=SICAQ
      const form2 = rF2.slice(1).map(r => ({
        timestamp:  parseDate(r[0]),
        dataInput:  parseDate(r[1]),
        corretor:   String(r[2]||'').toUpperCase().trim(),
        cliente:    String(r[3]||''),
        canal:      String(r[4]||'').toUpperCase().trim(),
        dataVisita: parseDate(r[5]),
        sicaq:      String(r[7]||'').toUpperCase(),
      })).filter(r => r.dataInput && r.corretor);

      // --- FORM 3 (Form_Visita_realizada) ---
      // Col: A=timestamp, B=dataVisita, C=corretor, E=resultado,
      //      H=gerenteParticipou, J=canal
      const form3 = rF3.slice(1).map(r => ({
        timestamp:   parseDate(r[0]),
        data:        parseDate(r[1]),
        corretor:    String(r[2]||'').toUpperCase().trim(),
        resultado:   String(r[4]||'').toUpperCase(),
        gerente:     String(r[7]||'').toUpperCase(),
        canal:       String(r[9]||'').toUpperCase().trim(),
      })).filter(r => r.data && r.corretor);

      // --- CONTROLE DIARIO ---
      // Col: A=data, B=corretor, C=gerente, D=super, E=status
      const controle = rCtrl.slice(1).map(r => ({
        data:   parseDate(r[0]),
        corretor: String(r[1]||'').toUpperCase().trim(),
        gerente:  String(r[2]||'').toUpperCase().trim(),
        super_:   String(r[3]||'').toUpperCase().trim(),
        status:   String(r[4]||'').trim(),
      })).filter(r => r.data && r.corretor);

      // --- CADASTRO EQUIPE ---
      // Col: A=id, B=nome, C=cargo, D=super, E=gerente, F=status
      const cadastro = rCad.slice(1).map(r => ({
        nome:   String(r[1]||'').toUpperCase().trim(),
        cargo:  String(r[2]||'').trim(),
        super_: String(r[3]||'').toUpperCase().trim(),
        gerente:String(r[4]||'').toUpperCase().trim(),
        status: String(r[5]||'').trim(),
      })).filter(r => r.nome);

      setRaw({ form1, form2, form3, controle, cadastro });
      setLastUpdate(new Date());
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { raw, loading, error, refetch: fetch_, lastUpdate };
}
