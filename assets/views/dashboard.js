// Dashboard do Controle de Validade.
import { listar } from '../api.js?v=20261124a';
import * as ui from '../ui.js?v=20261124a';

const diasAte = (data) => {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo - hoje) / 86400000);
};

const mesDe = (data) => {
  if (!data) return 'Sem data';
  const [ano, mes] = String(data).split('-');
  return `${mes}/${ano}`;
};

export async function render(raiz, ctx) {
  ctx.setTitulo('Dashboard');

  const [itens, lojas, vinculos] = await Promise.all([
    listar('val_itens', { ordem: 'data_vencimento' }),
    listar('arm_lojas', { ordem: 'nome' }),
    listar('produto_por_fornecedor', { select: 'produto_id, fornecedores(razao_social)' }),
  ]);

  const fornecedorDoProduto = new Map();
  for (const v of vinculos) {
    if (v.produto_id) {
      fornecedorDoProduto.set(v.produto_id, v.fornecedores?.razao_social || null);
    }
  }

  const nomeLoja = new Map(lojas.map((l) => [l.id, l.nome]));

  const porLoja = new Map();
  const porMes = new Map();
  const porCategoria = new Map();
  const porFornecedor = new Map();

  let vencidos = 0;
  let vencendo = 0;
  let aguardando = 0;

  const somar = (mapa, chave, item, extras = {}) => {
    const atual = mapa.get(chave) || { itens: 0, quantidade: 0, ...extras };
    atual.itens += 1;
    atual.quantidade += Number(item.quantidade) || 0;
    if (extras.vencidos !== undefined) {
      const dias = diasAte(item.data_vencimento);
      if (dias !== null && dias < 0) atual.vencidos += 1;
      else if (dias !== null && dias <= 30) atual.vencendo += 1;
    }
    mapa.set(chave, atual);
    return atual;
  };

  for (const item of itens) {
    const dias = diasAte(item.data_vencimento);

    somar(porLoja, item.loja_id || 'sem', item, { vencidos: 0, vencendo: 0 });
    somar(porMes, mesDe(item.data_vencimento), item);
    somar(porCategoria, item.categoria || 'Sem categoria', item);
    somar(porFornecedor, fornecedorDoProduto.get(item.produto_id) || 'Sem fornecedor', item);

    if (dias !== null && dias < 0) vencidos += 1;
    else if (dias !== null && dias <= 30) vencendo += 1;
    if (item.status === 'aguardando') aguardando += 1;
  }

  const tabela = (titulo, mapa, comVencimento = false) => {
    const linhas = [...mapa.entries()]
      .sort((a, b) => b[1].itens - a[1].itens || a[0].localeCompare(b[0]))
      .map(([nome, d]) => `<tr>
        <td>${ui.esc(comVencimento && nome === 'sem' ? 'Sem loja' : nome)}</td>
        <td class="num">${ui.num(d.itens, 0)}</td>
        <td class="num">${ui.num(d.quantidade, 2)}</td>
        ${comVencimento ? `<td class="num">${ui.num(d.vencendo, 0)}</td>
          <td class="num">${ui.num(d.vencidos, 0)}</td>` : ''}
      </tr>`).join('');

    return `<div class="cartao">
      <h2>${ui.esc(titulo)}</h2>
      ${mapa.size ? `<div class="tabela-rolagem"><table>
        <thead><tr><th>${ui.esc(titulo.replace('Por ', '').replace('por ', ''))}</th>
          <th class="num">Itens</th><th class="num">Quantidade</th>
          ${comVencimento ? '<th class="num">Vencendo</th><th class="num">Vencidos</th>' : ''}
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table></div>` : ui.vazio('Nenhum item no controle de validade ainda.')}
    </div>`;
  };

  const lojasOrdenadas = new Map(
    [...porLoja.entries()].map(([id, d]) => [nomeLoja.get(id) || 'Sem loja', d]));

  raiz.innerHTML = `
    <div class="kpis">
      <div class="kpi">
        <div class="rotulo">No controle</div>
        <div class="valor">${ui.num(itens.length, 0)}</div>
        <div class="detalhe">produtos sinalizados</div>
      </div>
      <div class="kpi">
        <div class="rotulo">Vencendo em 30 dias</div>
        <div class="valor">${ui.num(vencendo, 0)}</div>
        <div class="detalhe">atenção do comercial</div>
      </div>
      <div class="kpi">
        <div class="rotulo">Vencidos</div>
        <div class="valor" style="color:#b3261e">${ui.num(vencidos, 0)}</div>
        <div class="detalhe">prazo passou</div>
      </div>
      <div class="kpi">
        <div class="rotulo">Aguardando retorno</div>
        <div class="valor">${ui.num(aguardando, 0)}</div>
        <div class="detalhe">sem resposta do comercial</div>
      </div>
    </div>

    ${tabela('Por estabelecimento', lojasOrdenadas, true)}
    ${tabela('Por mês de vencimento', porMes)}
    ${tabela('Por categoria', porCategoria)}
    ${tabela('Por fornecedor', porFornecedor)}
  `;
}
