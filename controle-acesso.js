/* ====================================================================
   controle-acesso.js — Controle de acesso por perfil
   --------------------------------------------------------------------
   ADMIN     → acesso total (ver + editar tudo)
   CORRETOR  → SÓ-LEITURA do sistema + solicitar visitas
       • PODE ver:  Dashboard (vendas), Relatórios, imóveis captados
       • PODE usar: Visitas e Registrar Visita
       • NÃO acessa: Cadastrar Imóvel, Registrar Venda, Configurações, Propostas
       • NÃO edita:  botões de edição/cadastro ficam ocultos (e o banco recusa)

   Instalar em TODAS as páginas, logo após o db-supabase.js:
        <script src="controle-acesso.js"></script>
   ==================================================================== */
(function () {
  'use strict';

  // Páginas que o CORRETOR pode abrir. Todas as demais são exclusivas de admin.
  var LIBERADAS_CORRETOR = [
    'dash5.html',          // Dashboard (ver vendas)
    'relatorios.html',     // Relatórios (ver gráficos)
    'visitas.html',        // Visitas
    'registrarvisita.html',// Registrar visita
    'login.html',
    'index.html',
    ''                     // raiz "/"
  ];

  // Para onde mandar o corretor se ele tentar uma página só-admin:
  var DESTINO_CORRETOR = 'Dash5.html';

  var pagina = (location.pathname.split('/').pop() || '').toLowerCase();
  var paginaLiberada = (LIBERADAS_CORRETOR.indexOf(pagina) !== -1);

  document.addEventListener('DOMContentLoaded', function () {
    (async function () {
      try {
        if (!window.DB) return;          // sem camada de dados, não interfere
        await DB.requireAuth();          // exige login (senão vai pro login)

        var info = await DB.getCurrentUserRole();
        var isAdmin = !!(info && info.role === 'admin');

        if (isAdmin) return;             // admin: acesso total

        // ---------- CORRETOR ----------
        if (!paginaLiberada) {
          window.location.replace(DESTINO_CORRETOR);  // pagina so-admin -> barra
          return;
        }
        ocultarControlesDeAdmin();       // pagina liberada -> esconde edicao
      } catch (e) {
        window.location.replace('login.html');
      }
    })();
  });

  // Esconde, para o corretor, tudo que leva a editar/cadastrar.
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
