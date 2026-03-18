export const SHEET_ID = '1spNjzhYooefdXyLJhNm3Q31uDm0NzeI6xAvGz4bVh0U';

// GIDs das abas — fonte única de verdade
export const GID = {
  FORM1:          '1272476673',  // DADOS_FORM_REGISTRO
  FORM2:          '1195758856',  // Form_Clientes_agendados
  FORM3:          '2062092996',  // Form_Visita_realizada
  CONTROLE:       '938482408',   // CONTROLE_DIARIO
  CADASTRO:       '0',           // CADASTRO_EQUIPE (primeira aba)
  METRICAS_ANT:   '1322981096',  // Métricas_Anterior
  // Abas criadas pelo robô Power BI
  PBI_RAW:        '1204319696',  // PBI_RAW — dados brutos do robô
  PBI_VENDAS:     '705174340',   // PBI_VENDAS — todas as vendas do CRM
  PBI_CORRETORES: '922343080',   // PBI_CORRETORES — dias sem vender por corretor
  PBI_RESUMO:     '721787347',   // PBI_RESUMO — VGV total + recebimento
};

// URL CSV pública para qualquer aba
export const csvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
