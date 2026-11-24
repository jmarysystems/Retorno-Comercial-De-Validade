// Retorno comercial: itens do controle de validade aguardando resposta.
import { listar, atualizar } from '../api.js?v=20261124a';
import * as ui from '../ui.js?v=20261124a';

const diasAte = (data) => {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo - hoje) / 86400000);
};

const situacao = (item) => {
  const dias = diasAte(item.data_vencimento);
  if (dias === null) return { texto: '—', cor: 'neutro' };
  if (dias < 0) return { texto: `vencido há ${Math.abs(dias)}d`, cor: 'vermelho' };
  if (dias === 0) return { texto: 'vence hoje', cor: 'laranja' };
  if (dias <= 30) return { texto: `${dias}d`, cor: 'amarelo' };
  return { texto: `${dias}d`, cor: 'verde' };
};

export async function render(raiz, ctx) {
  ctx.setTitulo('Retorno comercial');

  const podeResponder = ctx.pode('validade', 'editar')
    || ctx.pode('validade', 'cadastrar');

  const [todos, lojas] = await Promise.all([
    listar('val_itens', { ordem: 'data_vencimento' }),
    listar('arm_lojas', { ordem: 'nome' }),
  ]);

  const pendentes = todos.filter((i) => i.status !== 'respondido'
    && i.status !== 'cancelado');
  const nomeLoja = new Map(lojas.map((l) => [l.id, l.nome]));

  raiz.innerHTML = `
    <div class="cartao">
      <div class="cartao-topo">
        <h2><span id="contador">${pendentes.length}</span> item(ns) aguardando retorno</h2>
      </div>

      <div class="grade grade-3">
        <label class="campo"><span>Estabelecimento</span>
          <select id="filtro-loja">
            <option value="">Todos</option>
            ${lojas.map((l) => `<option value="${ui.esc(l.id)}">${ui.esc(l.nome)}</option>`).join('')}
          </select></label>
        <label class="campo"><span>Categoria</span>
          <select id="filtro-categoria">
            <option value="">Todas</option>
            ${[...new Set(pendentes.map((i) => i.categoria).filter(Boolean))]
              .sort().map((c) => `<option value="${ui.esc(c)}">${ui.esc(c)}</option>`).join('')}
          </select></label>
        <label class="campo"><span>Pesquisar</span>
          <input type="search" id="busca" placeholder="EAN, SKU ou descrição"></label>
      </div>

      <div id="tabela" style="margin-top:12px"></div>
    </div>`;

  const selLoja = raiz.querySelector('#filtro-loja');
  const selCategoria = raiz.querySelector('#filtro-categoria');
  const busca = raiz.querySelector('#busca');
  const tabela = raiz.querySelector('#tabela');
  const contador = raiz.querySelector('#contador');

  function filtrados() {
    const termo = busca.value.trim().toLowerCase();
    return pendentes.filter((i) => {
      if (selLoja.value && i.loja_id !== selLoja.value) return false;
      if (selCategoria.value && i.categoria !== selCategoria.value) return false;
      if (!termo) return true;
      return `${i.ean || ''} ${i.sku || ''} ${i.descricao || ''}`.toLowerCase().includes(termo);
    });
  }

  function desenhar() {
    const visiveis = filtrados();
    contador.textContent = visiveis.length;

    tabela.innerHTML = visiveis.length ? `
      <div class="tabela-rolagem"><table>
        <thead><tr>
          <th>ID</th><th>Data da sinalização</th><th>Loja</th>
          <th>Data de vencimento</th><th>Situação</th><th class="num">Quantidade</th>
          <th>EAN</th><th>SKU</th><th>Descrição do produto</th><th>UMB</th>
          <th>Categoria</th><th>Remetente</th><th></th>
        </tr></thead>
        <tbody>
          ${visiveis.map((i) => {
            const st = situacao(i);
            return `<tr>
              <td class="mono">${ui.esc((i.id || '').slice(0, 6))}</td>
              <td>${i.data_sinalizacao ? ui.dataBR(i.data_sinalizacao) : '—'}</td>
              <td>${ui.esc(nomeLoja.get(i.loja_id) || '—')}</td>
              <td>${i.data_vencimento ? ui.dataBR(i.data_vencimento) : '—'}</td>
              <td>${ui.badge(st.texto, st.cor)}</td>
              <td class="num">${ui.num(i.quantidade, 3)}</td>
              <td class="mono">${ui.esc(i.ean || '—')}</td>
              <td class="mono">${ui.esc(i.sku || '—')}</td>
              <td>${ui.esc(i.descricao || '')}</td>
              <td>${ui.esc(i.umb || '')}</td>
              <td>${ui.esc(i.categoria || '')}</td>
              <td>${ui.esc(i.remetente || '—')}</td>
              <td class="acoes">
                ${podeResponder ? `<button type="button" class="botao-pequeno botao-primario"
                  data-responder="${ui.esc(i.id)}">Responder</button>` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>` : ui.vazio('Nenhum item aguardando retorno. 🎉');

    ligar();
  }

  function ligar() {
    for (const b of tabela.querySelectorAll('[data-responder]')) {
      b.addEventListener('click', () => {
        const item = pendentes.find((i) => i.id === b.dataset.responder);
        if (!item) return;

        const { fechar, corpo } = ui.modal({
          titulo: item.descricao || item.sku,
          largura: '620px',
          corpo: `
            <div class="grade grade-2">
              <div><span class="sub">EAN</span><div>${ui.esc(item.ean || '—')}</div></div>
              <div><span class="sub">SKU</span><div>${ui.esc(item.sku || '—')}</div></div>
              <div><span class="sub">Categoria</span><div>${ui.esc(item.categoria || '—')}</div></div>
              <div><span class="sub">Loja</span><div>${ui.esc(nomeLoja.get(item.loja_id) || '—')}</div></div>
              <div><span class="sub">Quantidade</span><div>${ui.num(item.quantidade, 3)}</div></div>
              <div><span class="sub">Vencimento</span><div>${
                item.data_vencimento ? ui.dataBR(item.data_vencimento) : '—'}</div></div>
              <div><span class="sub">Data da sinalização</span><div>${
                item.data_sinalizacao ? ui.dataBR(item.data_sinalizacao) : '—'}</div></div>
              <div><span class="sub">Remetente</span><div>${ui.esc(item.remetente || '—')}</div></div>
            </div>
            <label class="campo" style="margin-top:12px"><span>Retorno do comercial</span>
              <textarea id="retorno" rows="4" placeholder="ex.: produto será trocado / devolvido / promovido"></textarea></label>
            <div class="linha-acoes" style="margin-top:12px">
              <button type="button" class="botao-primario" id="enviar">Responder</button>
              <button type="button" id="cancelar">Cancelar</button>
            </div>
            <div class="sub" id="info" style="margin-top:8px"></div>`,
        });

        corpo.querySelector('#cancelar').addEventListener('click', fechar);
        corpo.querySelector('#enviar').addEventListener('click', async () => {
          const texto = corpo.querySelector('#retorno').value.trim();
          const info = corpo.querySelector('#info');

          if (!texto) { ui.toast('Escreva o retorno.', 'erro'); return; }

          const botao = corpo.querySelector('#enviar');
          botao.disabled = true;
          botao.textContent = 'Enviando…';

          try {
            await atualizar('val_itens', item.id, {
              retorno: texto,
              status: 'respondido',
              data_retorno: new Date().toISOString(),
              nome_retorno: ctx.perfil?.nome || null,
            });
            ui.toast('Retorno registrado.');
            fechar();
            ctx.recarregar();
          } catch (erro) {
            ui.toast(erro.message, 'erro');
            if (info) info.textContent = erro.message;
            botao.disabled = false;
            botao.textContent = 'Responder';
          }
        });
      });
    }
  }

  selLoja.addEventListener('change', desenhar);
  selCategoria.addEventListener('change', desenhar);
  busca.addEventListener('input', desenhar);
  desenhar();
}
