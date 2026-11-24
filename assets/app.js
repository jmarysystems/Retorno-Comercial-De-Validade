// Shell: login, layout e rotas do Retorno Comercial de Validade.
import { sb, sair, sessao, meuPerfil, entrar, minhasPermissoes } from './api.js?v=20261124a';
import { SISTEMA } from './config.js?v=20261124a';
import * as ui from './ui.js?v=20261124a';
import * as dashboard from './views/dashboard.js?v=20261124a';
import * as retorno from './views/retorno.js?v=20261124a';
import * as lista from './views/lista.js?v=20261124a';

const app = document.getElementById('app');
let perfil = null;

const ROTULOS = {
  admin_sistema: 'Administrador do Sistema',
  administrador: 'Administrador',
  leitura: 'Leitura',
  fornecedor: 'Fornecedor',
  armazenados: 'Armazenados',
  comercial: 'Comercial',
};

function telaLogin(mensagem = '') {
  app.innerHTML = `
    <div class="tela-login">
      <form class="cartao-login" id="form-login">
        <div class="marca"><span class="marca-icone">◫</span>${ui.esc(SISTEMA)}</div>
        <h1>Entrar</h1>
        <p class="sub">Acesso com CPF/CNPJ e senha.</p>
        ${mensagem ? `<div class="erro">${ui.esc(mensagem)}</div>` : ''}
        <label class="campo"><span>CPF/CNPJ ou e-mail</span>
          <input name="documento" autocomplete="username" required autofocus></label>
        <label class="campo"><span>Senha</span>
          <input name="senha" type="password" autocomplete="current-password" required></label>
        <button class="botao-primario" style="width:100%" type="submit">Entrar</button>
      </form>
    </div>`;

  const form = document.getElementById('form-login');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const botao = form.querySelector('button');
    botao.disabled = true;
    botao.textContent = 'Entrando…';
    try {
      await entrar(form.documento.value, form.senha.value);
      perfil = await meuPerfil();
      if (perfil) perfil.permissoes = await minhasPermissoes();
      iniciarApp();
    } catch (erro) {
      await sair();
      telaLogin(erro.message);
    }
  });
}

function iniciarApp() {
  app.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="marca"><span class="marca-icone">◫</span>${ui.esc(SISTEMA)}</div>
        <nav>
          <a class="nav-item" data-rota="#/dashboard" href="#/dashboard">
            <span class="icone">▦</span>Dashboard</a>
          <a class="nav-item" data-rota="#/retorno" href="#/retorno">
            <span class="icone">✎</span>Retorno comercial</a>
          <a class="nav-item" data-rota="#/lista" href="#/lista">
            <span class="icone">☰</span>Produtos no controle</a>
        </nav>
        <div class="sidebar-rodape">
          <div class="quem">${ui.esc(perfil.nome)}</div>
          <div class="papel">${ui.esc(ROTULOS[perfil.perfil] || perfil.perfil || '')}</div>
          <button type="button" id="sair">Sair</button>
        </div>
      </aside>
      <div class="conteudo">
        <header class="topbar"><h1 id="titulo">Dashboard</h1></header>
        <main id="view"><div class="carregando">Carregando…</div></main>
      </div>
    </div>`;

  document.getElementById('sair').addEventListener('click', async () => {
    await sair();
    perfil = null;
    telaLogin('Você saiu.');
  });

  if (!location.hash) location.hash = '#/dashboard';
  window.addEventListener('hashchange', navegar);
  navegar();
}

async function navegar() {
  const raiz = document.getElementById('view');
  if (!raiz) return;

  const caminho = (location.hash || '#/dashboard').replace(/^#\/?/, '');
  const [seg] = caminho.split('/');

  for (const link of document.querySelectorAll('.nav-item')) {
    const rota = (link.dataset.rota || '').replace(/^#\//, '').split('/')[0];
    link.classList.toggle('ativo', rota === seg);
  }

  const ctx = {
    perfil,
    pode: (modulo, acao) => {
      const p = perfil.permissoes || {};
      if (p.admin) return true;
      const m = p[modulo];
      return !!(m && m[acao]);
    },
    irPara: (hash) => { location.hash = hash; },
    recarregar: () => navegar(),
    setTitulo: (texto) => {
      document.getElementById('titulo').textContent = texto;
      document.title = `${texto} · ${SISTEMA}`;
    },
  };

  raiz.innerHTML = '<div class="carregando">Carregando…</div>';

  try {
    if (seg === 'retorno') return await retorno.render(raiz, ctx);
    if (seg === 'lista') return await lista.render(raiz, ctx);
    return await dashboard.render(raiz, ctx);
  } catch (erro) {
    raiz.innerHTML = `<div class="cartao"><h2>Não foi possível carregar</h2>
      <p class="sub">${ui.esc(erro.message)}</p></div>`;
  }
}

sb.auth.onAuthStateChange((evento) => {
  if (evento === 'SIGNED_OUT' && perfil) {
    perfil = null;
    telaLogin('Sessão encerrada.');
  }
});

(async function iniciar() {
  try {
    const s = await sessao();
    if (!s) return telaLogin();
    perfil = await meuPerfil();
    if (perfil) perfil.permissoes = await minhasPermissoes();
    iniciarApp();
  } catch (erro) {
    telaLogin(erro.message);
  }
})();
