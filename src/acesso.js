/**
 * acesso.js — Escopo de visualização por Superintendência.
 *
 * ⚠️ LEIA ANTES DE CONFIAR NISTO:
 * Este filtro é CONVENIÊNCIA, não sigilo. O app baixa a planilha inteira de uma
 * URL pública e filtra no navegador. Quem abrir o DevTools — ou a própria URL da
 * planilha — vê os dados de todas as superintendências, com ou sem este arquivo.
 * Os tokens abaixo também ficam visíveis no bundle.
 *
 * Para sigilo de verdade: despublicar a planilha e filtrar no servidor
 * (função serverless no Vercel com conta de serviço) ANTES de o dado sair.
 *
 * Serve para: manter a tela do SUP limpa e focada no time dele.
 * Não serve para: impedir que um SUP veja os números de outro.
 */

// Token opaco → escopo. Trocar o token revoga o link antigo.
// '*' = Diretoria (visão completa). É o SEU link e o da Lisboa.
export const ACESSOS = {
  dq3m8z: '*',          // DIRETORIA — Thiago / Lisboa
  ar7k2m: 'ARTHUR',
  bt4p9x: 'BETEL',
  fx8n3q: 'FELIX',
  sx5v7d: 'SEIXAS',
  vr2j6h: 'VERONICA',
};

export const PAGINAS_DIRETORIA = ['diretoria', 'super', 'gerencia', 'corretor', 'arena', 'ranking'];
export const PAGINAS_SUP       = ['super', 'gerencia', 'corretor', 'arena', 'ranking'];

/**
 * Lê ?e=<token> da URL e devolve o escopo da sessão.
 *
 * FAIL-CLOSED: token ausente, errado ou com um caractere trocado NÃO cai na
 * Diretoria — cai em 'negado'. Um erro de digitação nunca pode virar acesso
 * total; é o contrário do que se espera de um erro.
 */
export function resolverAcesso(search) {
  let token = '';
  try {
    const qs = new URLSearchParams(
      search !== undefined ? search
        : (typeof window !== 'undefined' ? window.location.search : '')
    );
    token = String(qs.get('e') || '').trim().toLowerCase();
  } catch (e) {
    token = '';
  }

  const alvo = ACESSOS[token];

  // Nada reconhecido → bloqueia. Nunca degrada para a visão completa.
  if (!alvo) {
    return { escopo: 'negado', sup: null, paginas: [], inicial: null };
  }
  if (alvo === '*') {
    return { escopo: 'diretoria', sup: null, paginas: PAGINAS_DIRETORIA, inicial: 'diretoria' };
  }
  return { escopo: 'sup', sup: alvo, paginas: PAGINAS_SUP, inicial: 'super' };
}

/**
 * Tira o token da barra de endereços depois de lido, para não ficar exposto em
 * print de tela, projetor ou histórico compartilhado. Não muda a navegação.
 */
export function limparUrl() {
  try {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    if (!window.location.search) return;
    window.history.replaceState({}, '', window.location.pathname);
  } catch (e) { /* silencioso */ }
}

/**
 * Recorta o objeto `data` para uma superintendência.
 *
 * ⚠️ CHAMAR SEMPRE DEPOIS do calcularData, nunca antes.
 * `referencia` (mediana do time) e `media` ficam GLOBAIS de propósito: se fossem
 * recalculadas sobre a lista filtrada, o mesmo corretor teria score diferente na
 * tela do SUP e na tela da Diretoria.
 */
export function filtrarPorEscopo(d, acesso) {
  if (!d || !acesso || acesso.escopo !== 'sup') return d;

  const corretores = d.corretores.filter(c => c.superintendente === acesso.sup);
  const gerentes = [...new Set(corretores.map(c => c.gerente))].filter(Boolean).sort();

  return {
    ...d,                    // preserva referencia, media, iniciosSup
    corretores: corretores,
    supers: [acesso.sup],
    gerentes: gerentes,
  };
}

/** Monta o link de acesso de um SUP (usado só para você copiar e enviar). */
export function linkDoSup(nomeSup, base) {
  const alvo = String(nomeSup).toUpperCase() === 'DIRETORIA'
    ? '*' : String(nomeSup).toUpperCase();
  const entrada = Object.entries(ACESSOS).find(([, s]) => s === alvo);
  if (!entrada) return null;
  const raiz = base || (typeof window !== 'undefined' ? window.location.origin : '');
  return raiz + '/?e=' + entrada[0];
}
