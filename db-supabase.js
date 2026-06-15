/* =====================================================================
   db-supabase.js  —  Camada de acesso a dados do Dashboard Acontece
   ---------------------------------------------------------------------
   Substitui o localStorage. Todas as páginas (login, cadastro, dashboard,
   propostas, relatórios) usam estas funções.

   COMO USAR em cada HTML, ANTES de fechar o </body>:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="db-supabase.js"></script>

   PREENCHA abaixo com os dados do seu projeto:
     Supabase -> Settings -> API
       Project URL  -> SUPABASE_URL
       anon public  -> SUPABASE_ANON_KEY   (pode ficar pública, é seguro com RLS)
   ===================================================================== */

const SUPABASE_URL      = 'https://wckjaoiyuxshkhahzkco.supabase.co';   // <-- TROCAR
const SUPABASE_ANON_KEY = 'sb_publishable_ugJ3-zZ4RoW1NJPl_Eb-Qg_iKMhf0cL';        // <-- TROCAR

// cria o cliente apontando para o schema "vendas"
const supaClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db:   { schema: 'vendas' },
    auth: { persistSession: true, autoRefreshToken: true }
});

/* =====================================================================
   Helpers de data / moeda (mesmo formato que o app já usa)
   ===================================================================== */
function _isoParaBR(iso) { if (!iso) return ''; const [a,m,d]=iso.split('-'); return `${d}/${m}/${a}`; }
function _brParaIso(br)  { if (!br)  return null; const [d,m,a]=br.split('/'); return `${a}-${m}-${d}`; }
function _mesRef(iso)    { if (!iso) return null; const [a,m]=iso.split('-'); return `${a}-${m}`; }

/* =====================================================================
   DB — objeto único com tudo. Use: await DB.listImoveis(), etc.
   ===================================================================== */
const DB = {
    client: supaClient,

    /* ---------------- AUTENTICAÇÃO ---------------- */
    async signIn(email, password) {
        const { data, error } = await supaClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },
    async signOut() {
        await supaClient.auth.signOut();
        window.location.href = 'login.html';
    },
    async getSession() {
        const { data } = await supaClient.auth.getSession();
        return data.session;
    },
    async getUser() {
        const { data } = await supaClient.auth.getUser();
        return data.user;
    },
    /* Chame no topo de cada página protegida. Redireciona se não logado. */
    async requireAuth() {
        const session = await this.getSession();
        if (!session) { window.location.href = 'login.html'; return null; }
        return session;
    },

    /* ---------------- IMÓVEIS (captações) ----------------
       Retorna no MESMO formato que o app usava no localStorage:
       { code, address, captador, date(dd/mm/aaaa), price, status, mes } */
    async listImoveis() {
        const { data, error } = await supaClient
            .from('imoveis')
            .select('codigo,endereco,captador,data_captacao,preco,status,mes_ref')
            .order('data_captacao', { ascending: true }); // Ordem crescente: mais antigos primeiro
        if (error) throw error;
        return (data || []).map(r => ({
            code: r.codigo, address: r.endereco, captador: r.captador,
            date: _isoParaBR(r.data_captacao), price: Number(r.preco) || 0,
            status: r.status, mes: r.mes_ref
        }));
    },

    async codigoExiste(codigo) {
        const { count, error } = await supaClient
            .from('imoveis')
            .select('codigo', { count: 'exact', head: true })
            .eq('codigo', codigo.toUpperCase());
        if (error) throw error;
        return (count || 0) > 0;
    },

    /* obj esperado: { code, address, captador, dateIso(yyyy-mm-dd), price, status } */
    async addImovel(obj) {
        const dateIso = obj.dateIso || _brParaIso(obj.date);
        const { data, error } = await supaClient.from('imoveis').insert({
            codigo: obj.code.trim().toUpperCase(),
            endereco: obj.address.trim(),
            captador: obj.captador,
            data_captacao: dateIso,
            preco: obj.price,
            status: obj.status,
            mes_ref: _mesRef(dateIso)
        }).select();
        if (error) throw error;
        return data;
    },

    async updateImovel(codigo, obj) {
        const dateIso = obj.dateIso || _brParaIso(obj.date);
        const patch = {
            endereco: obj.address, captador: obj.captador,
            data_captacao: dateIso, preco: obj.price,
            status: obj.status, mes_ref: _mesRef(dateIso)
        };
        const { error } = await supaClient.from('imoveis')
            .update(patch).eq('codigo', codigo.toUpperCase());
        if (error) throw error;
    },

    async deleteImovel(codigo) {
        const { error } = await supaClient.from('imoveis')
            .delete().eq('codigo', codigo.toUpperCase());
        if (error) throw error;
    },

    /* Busca um imóvel específico pelo código */
    async getImovelByCodigo(codigo) {
        const { data, error } = await supaClient
            .from('imoveis')
            .select('codigo,endereco,captador,data_captacao,preco,status,mes_ref')
            .eq('codigo', codigo.toUpperCase())
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null; // não encontrado
            throw error;
        }
        return data ? {
            code: data.codigo, address: data.endereco, captador: data.captador,
            date: _isoParaBR(data.data_captacao), price: Number(data.preco) || 0,
            status: data.status, mes: data.mes_ref
        } : null;
    },

    /* Verifica se um imóvel já foi vendido */
    async imovelJaVendido(codigo) {
        const { count, error } = await supaClient
            .from('vendas')
            .select('imovel_codigo', { count: 'exact', head: true })
            .eq('imovel_codigo', codigo.toUpperCase());
        if (error) throw error;
        return (count || 0) > 0;
    },

    /* ---------------- CORRETORES / CAPTADORES ---------------- */
    async listCorretores() {
        const { data, error } = await supaClient
            .from('corretores')
            .select('id,nome,tipo,email,telefone,ativo')
            .order('nome');
        if (error) throw error;
        return (data || []).map(c => ({
            id: c.id, name: c.nome, type: c.tipo,
            email: c.email, phone: c.telefone, ativo: c.ativo
        }));
    },

    /* ---------------- VENDAS ---------------- */
    async listVendas() {
        const { data, error } = await supaClient
            .from('vendas')
            .select('imovel_codigo,endereco,captador,corretor,data_venda,valor,comissao,mes_ref')
            .order('data_venda', { ascending: true }); // Ordem crescente: mais antigas primeiro
        if (error) throw error;
        return (data || []).map(r => ({
            code: r.imovel_codigo, address: r.endereco, captador: r.captador,
            corretor: r.corretor, date: _isoParaBR(r.data_venda),
            value: Number(r.valor) || 0, commission: Number(r.comissao) || 0, mes: r.mes_ref
        }));
    },

    /* Adiciona uma nova venda E atualiza o status do imóvel automaticamente */
    async addVenda(obj) {
        const dateIso = obj.dateIso || _brParaIso(obj.date);
        
        // 1. Verificar se o imóvel existe
        const imovel = await this.getImovelByCodigo(obj.code);
        if (!imovel) {
            throw new Error(`Imóvel ${obj.code} não encontrado na base de captações.`);
        }
        
        // 2. Verificar se já foi vendido
        const jaVendido = await this.imovelJaVendido(obj.code);
        if (jaVendido) {
            throw new Error(`Imóvel ${obj.code} já possui uma venda registrada.`);
        }
        
        // 3. Inserir a venda
        const { data, error } = await supaClient.from('vendas').insert({
            imovel_codigo: obj.code.toUpperCase(),
            endereco: obj.address,
            captador: obj.captador,
            corretor: obj.corretor,
            data_venda: dateIso,
            valor: obj.value,
            comissao: obj.commission || 0,
            mes_ref: _mesRef(dateIso)
        }).select();
        
        if (error) throw error;
        
        // 4. Atualizar status do imóvel para "Vendido"
        await this.updateImovel(obj.code, {
            address: imovel.address,
            captador: imovel.captador,
            dateIso: _brParaIso(imovel.date),
            price: imovel.price,
            status: 'Vendido'
        });
        
        return data;
    },

    /* Atualiza uma venda existente (pelo código do imóvel, que é unique na tabela vendas) */
    async updateVenda(codigo, obj) {
        const dateIso = obj.dateIso || _brParaIso(obj.date);
        const patch = {
            endereco: obj.address,
            captador: obj.captador,
            corretor: obj.corretor,
            data_venda: dateIso,
            valor: obj.value,
            comissao: obj.commission || 0,
            mes_ref: _mesRef(dateIso)
        };
        const { error } = await supaClient.from('vendas')
            .update(patch).eq('imovel_codigo', codigo.toUpperCase());
        if (error) throw error;
    },

    /* Deleta uma venda (pelo código do imóvel) */
    async deleteVenda(codigo) {
        const { error } = await supaClient.from('vendas')
            .delete().eq('imovel_codigo', codigo.toUpperCase());
        if (error) throw error;
    },

    /* ---------------- PROPOSTAS ---------------- */
    async listPropostas() {
        const { data, error } = await supaClient
            .from('propostas').select('*')
            .order('data_hora_registro', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    /* ---------------- METAS ---------------- */
    async listMetas() {
        const { data, error } = await supaClient
            .from('metas').select('*').order('data_inicio');
        if (error) throw error;
        return data || [];
    }
};

window.DB = DB;
