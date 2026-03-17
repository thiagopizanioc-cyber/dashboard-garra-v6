export const SHEET_ID = '1spNjzhYooefdXyLJhNm3Q31uDm0NzeI6xAvGz4bVh0U';

// GIDs das abas — fonte única de verdade
export const GID = {
  FORM1:          '1272476673',  // DADOS_FORM_REGISTRO
  FORM2:          '1195758856',  // Form_Clientes_agendados
  FORM3:          '2062092996',  // Form_Visita_realizada
  CONTROLE:       '938482408',   // CONTROLE_DIARIO
  CADASTRO:       '0',           // CADASTRO_EQUIPE (primeira aba)
  METRICAS_ANT:   '1322981096',  // Métricas_Anterior (referência período passado)
};

// URL CSV pública para qualquer aba
export const csvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
