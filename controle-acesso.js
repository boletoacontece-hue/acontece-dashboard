/* ====================================================================
   controle-acesso.js — Controle de acesso por perfil
   --------------------------------------------------------------------
   ADMIN     → acesso total (ver + editar tudo)
   CORRETOR  → SÓ-LEITURA do sistema + solicitar visitas
       • PODE ver:  Dashboard, Relatórios, Análise de Vendas, imóveis captados
       • PODE usar: Visitas e Registrar Visita
       • NÃO acessa: Cadastrar Imóvel, Registrar Venda, Configurações
       • NÃO edita:  botões de edição/cadastro ficam ocultos (e o banco recusa)

   Pode ser incluído em TODAS as páginas (login/index são ignorados com segurança),
   logo após o db-supabase.js:
        <script src="controle-acesso.js"></script>
   ==================================================================== */
(function () {
  'use strict';

  // Páginas públicas: o porteiro NÃO age (não exige login aqui).
  var PUBLICAS = ['login.html', 'index.html', ''];

  // Páginas que o CORRETOR pode ver (só-leitura). As demais são só-admin.
  var LIBERADAS_CORRETOR = [
    'dash5.html',
    'relatorios.html',
    'analisevendas.html',
    'visitas.html',
    'registrarvisita.html'
  ];

  var DESTINO_CORRETOR = 'Dash5.html';
  var pagina = (location.pathname.split('/').pop() || '').toLowerCase();

  // login / index / raiz: não faz nada (evita interferir no fluxo de login)
  if (PUBLICAS.indexOf(pagina) !== -1) return;

  document.addEventListener('DOMContentLoaded', function () {
    (async function () {
      try {
        if (!window.DB) return;
        await DB.requireAuth();
        var info = await DB.getCurrentUserRole();
        var isAdmin = !!(info && info.role === 'admin');
        if (isAdmin) return;

        // Corretor: se a página não está na lista de liberadas, é só-admin → barra.
        if (LIBERADAS_CORRETOR.indexOf(pagina) === -1) {
          window.location.replace(DESTINO_CORRETOR);
          return;
        }
        ocultarControlesDeAdmin();
      } catch (e) {
        window.location.replace('login.html');
      }
    })();
  });

  function ocultarControlesDeAdmin() {
    document.body.classList.add('perfil-corretor');
    var st = document.createElement('style');
    st.textContent =
      'a[href*="Configuracoes"],a[href*="CadastroImovel"],a[href*="RegistrarVenda"],a[href*="Propostas"],' +
      'button[onclick*="Configuracoes"],button[onclick*="CadastroImovel"],button[onclick*="RegistrarVenda"],button[onclick*="Propostas"],' +
      '.somente-admin,[data-somente-admin]{display:none !important;}';
    document.head.appendChild(st);
  }
})();
