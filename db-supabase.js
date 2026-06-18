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

    /* Listar corretores COM role (usar APENAS após executar migration 003) */
    async listCorretoresComRole() {
        const { data, error } = await supaClient
            .from('corretores')
            .select('id,nome,tipo,email,telefone,ativo,role')
            .order('nome');
        if (error) throw error;
        return (data || []).map(c => ({
            id: c.id, name: c.nome, type: c.tipo,
            email: c.email, phone: c.telefone, ativo: c.ativo,
            role: c.role || 'corretor'
        }));
    },

    /* Obter informações do corretor pelo email (incluindo role) */
    async getCorretorByEmail(email) {
        const { data, error } = await supaClient
            .from('corretores')
            .select('id,nome,tipo,email,telefone,ativo,role')
            .eq('email', email)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data ? {
            id: data.id, name: data.nome, type: data.tipo,
            email: data.email, phone: data.telefone, ativo: data.ativo,
            role: data.role || 'corretor'
        } : null;
    },

    /* Verificar se o usuário logado é admin */
    async isAdmin() {
        try {
            const session = await this.getSession();
            if (!session?.user?.email) return false;
            
            const corretor = await this.getCorretorByEmail(session.user.email);
            return corretor?.role === 'admin';
        } catch (error) {
            console.error('Erro ao verificar role de admin:', error);
            return false;
        }
    },

    /* Obter role e informações completas do usuário atual */
    async getCurrentUserRole() {
        try {
            const session = await this.getSession();
            if (!session?.user?.email) return null;
            
            const corretor = await this.getCorretorByEmail(session.user.email);
            if (!corretor) return null;
            
            return {
                id: corretor.id,
                name: corretor.name,
                email: corretor.email,
                type: corretor.type,
                role: corretor.role,
                isAdmin: corretor.role === 'admin'
            };
        } catch (error) {
            console.error('Erro ao buscar role do usuário:', error);
            return null;
        }
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
    },

    /* ---------------- VISITAS ---------------- */
    
    /**
     * Lista todas as visitas
     * @param {Object} filtros - Filtros opcionais { corretor_id, imovel_codigo, status, data_inicio, data_fim }
     * @returns {Promise<Array>}
     */
    async listVisitas(filtros = {}) {
        let query = supaClient
            .from('visitas')
            .select('*')
            .order('data_visita', { ascending: false })
            .order('horario_visita', { ascending: false });
        
        // Aplicar filtros
        if (filtros.corretor_id) {
            query = query.eq('corretor_id', filtros.corretor_id);
        }
        if (filtros.imovel_codigo) {
            query = query.eq('imovel_codigo', filtros.imovel_codigo.toUpperCase());
        }
        if (filtros.status) {
            query = query.eq('status', filtros.status);
        }
        if (filtros.data_inicio) {
            query = query.gte('data_visita', filtros.data_inicio);
        }
        if (filtros.data_fim) {
            query = query.lte('data_visita', filtros.data_fim);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    /**
     * Adiciona uma nova visita
     * @param {Object} obj - Dados da visita
     * @returns {Promise<Object>}
     */
    async addVisita(obj) {
        // Validações
        if (!obj.corretor_nome || !obj.cliente_nome || !obj.imovel_codigo) {
            throw new Error('Campos obrigatórios: corretor_nome, cliente_nome, imovel_codigo');
        }
        if (!obj.data_visita || !obj.horario_visita) {
            throw new Error('Data e horário da visita são obrigatórios');
        }

        // Buscar informações do imóvel
        const imovel = await this.getImovelByCodigo(obj.imovel_codigo);
        if (!imovel) {
            throw new Error(`Imóvel ${obj.imovel_codigo} não encontrado`);
        }

        // Buscar ID do corretor pelo nome (se não vier)
        let corretor_id = obj.corretor_id;
        if (!corretor_id && obj.corretor_nome) {
            const corretores = await this.listCorretores();
            const corretor = corretores.find(c => c.name === obj.corretor_nome);
            corretor_id = corretor?.id || null;
        }

        // Montar payload
        const payload = {
            corretor_id: corretor_id,
            corretor_nome: obj.corretor_nome,
            cliente_nome: obj.cliente_nome,
            cliente_telefone: obj.cliente_telefone || null,
            imovel_codigo: obj.imovel_codigo.toUpperCase(),
            imovel_endereco: imovel.address,
            imovel_valor: parseFloat(imovel.price) || null,
            imovel_captador: imovel.captador || null,
            data_visita: obj.data_visita,
            horario_visita: obj.horario_visita,
            status: obj.status || 'pendente',
            observacoes: obj.observacoes || null,
            created_by: obj.created_by || 'sistema'
        };

        const { data, error } = await supaClient
            .from('visitas')
            .insert([payload])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    /**
     * Atualiza uma visita existente
     * @param {string} id - UUID da visita
     * @param {Object} obj - Campos a atualizar
     * @returns {Promise<void>}
     */
    async updateVisita(id, obj) {
        const patch = {};
        
        // Campos permitidos para atualização
        if (obj.cliente_nome !== undefined) patch.cliente_nome = obj.cliente_nome;
        if (obj.cliente_telefone !== undefined) patch.cliente_telefone = obj.cliente_telefone;
        if (obj.data_visita !== undefined) patch.data_visita = obj.data_visita;
        if (obj.horario_visita !== undefined) patch.horario_visita = obj.horario_visita;
        if (obj.status !== undefined) patch.status = obj.status;
        if (obj.observacoes !== undefined) patch.observacoes = obj.observacoes;
        if (obj.mensagem_enviada !== undefined) {
            patch.mensagem_enviada = obj.mensagem_enviada;
            if (obj.mensagem_enviada === true) {
                patch.mensagem_enviada_em = new Date().toISOString();
                patch.numero_destino = obj.numero_destino || null;
            }
        }

        const { error } = await supaClient
            .from('visitas')
            .update(patch)
            .eq('id', id);
        
        if (error) throw error;
    },

    /**
     * Deleta uma visita
     * @param {string} id - UUID da visita
     * @returns {Promise<void>}
     */
    async deleteVisita(id) {
        const { error } = await supaClient
            .from('visitas')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    },

    /**
     * Obtém estatísticas de visitas por imóvel
     * @param {string} codigo - Código do imóvel
     * @returns {Promise<Object>}
     */
    async getEstatisticasVisitasImovel(codigo) {
        const { data, error } = await supaClient
            .rpc('get_estatisticas_visitas_imovel', { 
                p_codigo_imovel: codigo.toUpperCase() 
            });
        
        if (error) throw error;
        return data && data.length > 0 ? data[0] : null;
    },

    /**
     * Obtém ranking de corretores por visitas
     * @param {string} dataInicio - Data inicial (formato YYYY-MM-DD)
     * @param {string} dataFim - Data final (formato YYYY-MM-DD)
     * @returns {Promise<Array>}
     */
    async getRankingCorretoresVisitas(dataInicio = null, dataFim = null) {
        const params = {};
        if (dataInicio) params.p_data_inicio = dataInicio;
        if (dataFim) params.p_data_fim = dataFim;
        
        const { data, error } = await supaClient
            .rpc('get_ranking_corretores_visitas', params);
        
        if (error) throw error;
        return data || [];
    },

    /* ---------------- CONFIGURAÇÕES ---------------- */
    
    /**
     * Obtém todas as configurações
     * @returns {Promise<Array>}
     */
    async listConfig() {
        const { data, error } = await supaClient
            .from('config')
            .select('*')
            .order('categoria')
            .order('chave');
        
        if (error) throw error;
        return data || [];
    },

    /**
     * Obtém uma configuração específica
     * @param {string} chave - Chave da configuração
     * @returns {Promise<any>} - Valor da configuração (já parseado do JSONB)
     */
    async getConfig(chave) {
        const { data, error } = await supaClient
            .from('config')
            .select('valor')
            .eq('chave', chave)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') return null; // Não encontrado
            throw error;
        }
        
        return data?.valor || null;
    },

    /**
     * Define/atualiza uma configuração
     * @param {string} chave - Chave da configuração
     * @param {any} valor - Valor (será convertido para JSONB)
     * @param {Object} opcoes - Opções adicionais { descricao, tipo, categoria }
     * @returns {Promise<void>}
     */
    async setConfig(chave, valor, opcoes = {}) {
        const payload = {
            chave: chave,
            valor: valor,
            descricao: opcoes.descricao || null,
            tipo: opcoes.tipo || 'json',
            categoria: opcoes.categoria || 'geral'
        };

        const { error } = await supaClient
            .from('config')
            .upsert([payload], { onConflict: 'chave' });
        
        if (error) throw error;
    },

    /**
     * Obtém o número do WhatsApp do gerente
     * @returns {Promise<string>}
     */
    async getWhatsAppGerente() {
        const numero = await this.getConfig('whatsapp_gerente_numero');
        const nome = await this.getConfig('whatsapp_gerente_nome');
        return {
            numero: numero || '5561999999999',
            nome: nome || 'Gerente'
        };
    }
};

window.DB = DB;
