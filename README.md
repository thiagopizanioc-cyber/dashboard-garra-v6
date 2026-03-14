# 🏆 SISTEMA GARRA — Dashboard Web

Dashboard de performance da equipe comercial, integrado diretamente com o Google Sheets.

## 🚀 Deploy (Vercel) — Passo a passo

### 1. Publicar a planilha na web
1. Abra a planilha no Google Sheets
2. **Arquivo → Compartilhar → Publicar na web**
3. Selecione a aba **Métricas_período** + formato **CSV**
4. Clique em **Publicar** e confirme

> ⚠️ Isso é diferente de "compartilhar com link". A planilha precisa estar **publicada na web**.

### 2. Subir no GitHub
```bash
git init
git add .
git commit -m "🚀 Deploy inicial - Dashboard GARRA"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/garra-dashboard.git
git push -u origin main
```

### 3. Deploy na Vercel
1. Acesse vercel.com → login com GitHub
2. **Add New → Project** → selecione `garra-dashboard`
3. Clique em **Deploy** (configurações já corretas)

Pronto! URL pública em ~60s. Cada `git push` faz deploy automático.

## 🔧 Configuração (src/hooks/useSheetData.js)
```js
const SHEET_ID = '1spNjzhYooefdXyLJhNm3Q31uDm0NzeI6xAvGz4bVh0U';
const GID = '1742286842'; // aba Métricas_período
```

## 📊 Funcionalidades
- KPIs globais do time (leads, agendamentos, visitas, pré-vendas, engajamento)
- Filtros por Superintendência e Gerente
- Funil de conversão animado com taxas
- Ranking de corretores ordenável por qualquer coluna
- Detalhe completo do corretor com comparação à média do time
- Canais de agendamento e visita por corretor
