export const SHEET_ID = '1spNjzhYooefdXyLJhNm3Q31uDm0NzeI6xAvGz4bVh0U';

// GIDs de cada aba — encontre clicando na aba e copiando o gid= da URL
export const GID_METRICAS   = '1742286842'; // aba Métricas_período
export const GID_CONTROLE   = '938482408';  // aba CONTROLE_DIARIO

export const csvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
