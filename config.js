// config.js - Gerenciamento de Configurações
const CONFIG_KEYS = {
    CORRETORES: 'dashboard_corretores',
    METAS: 'dashboard_metas'
};

let editingUser = null;
let editingCorretor = null;
let editingMeta = null;

// ====================
// TAB MANAGEMENT
// ====================
function switchTab(tabName) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Recarregar dados da tab
    if (tabName === 'users') loadUsers();
    if (tabName === 'corretores') loadCorretores();
    if (tabName === 'imoveis') loadImoveis();
    if (tabName === 'metas') loadMetas();
}

// ====================
// USUÁRIOS
// ====================
function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="padding:24px; color:#616161; line-height:1.6;">'
        + 'A gestão de usuários agora é feita no painel do <strong>Supabase</strong> '
        + '(Authentication &rarr; Users), pois criar/remover login exige uma chave secreta que não pode ficar no site público. '
        + 'Adicione os membros da equipe por lá.</td></tr>';
}

function openUserModal() {
    alert('A gestão de usuários é feita no painel do Supabase (Authentication > Users).');
}

function editUser(user) {
    editingUser = user;
    document.getElementById('userModalTitle').textContent = 'Editar Usuário';
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').placeholder = 'Deixe em branco para não alterar';
    document.getElementById('userModal').classList.add('show');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('show');
    editingUser = null;
}

function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    loadUsers();
}

document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const name = document.getElementById('userName').value.trim();
    const username = document.getElementById('userUsername').value.trim();
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value;
    
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    if (userId) {
        // Editar usuário existente
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index].name = name;
            users[index].username = username;
            users[index].role = role;
            
            // Atualizar senha se fornecida
            if (password) {
                users[index].passwordHash = simpleHash(password);
            }
        }
    } else {
        // Criar novo usuário
        // Verificar se usuário já existe
        if (users.find(u => u.username === username)) {
            alert('Este nome de usuário já está em uso!');
            return;
        }
        
        if (!password) {
            alert('A senha é obrigatória para novos usuários!');
            return;
        }
        
        const newUser = {
            id: 'user_' + Date.now(),
            username,
            passwordHash: simpleHash(password),
            name,
            role,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
    }
    
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    closeUserModal();
    loadUsers();
});

// ====================
// CORRETORES
// ====================
function loadCorretores() {
    const corretores = JSON.parse(localStorage.getItem(CONFIG_KEYS.CORRETORES) || '[]');
    const tbody = document.getElementById('corretoresTableBody');
    tbody.innerHTML = '';
    
    if (corretores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#9e9e9e;">Nenhum corretor/captador cadastrado</td></tr>';
        return;
    }
    
    corretores.forEach(corretor => {
        const tr = document.createElement('tr');
        const typeLabels = {
            'Corretor': '<span class="badge badge-info">Corretor</span>',
            'Captador': '<span class="badge badge-success">Captador</span>',
            'Ambos': '<span class="badge badge-warning">Corretor & Captador</span>'
        };
        
        tr.innerHTML = `
            <td><strong>${corretor.name}</strong></td>
            <td>${typeLabels[corretor.type]}</td>
            <td>${corretor.email || '-'}</td>
            <td>${corretor.phone || '-'}</td>
            <td>
                <button class="btn btn-secondary btn-small" onclick='editCorretor(${JSON.stringify(corretor)})'>Editar</button>
                <button class="btn btn-danger btn-small" onclick='deleteCorretor("${corretor.id}")'>Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openCorretorModal() {
    editingCorretor = null;
    document.getElementById('corretorModalTitle').textContent = 'Adicionar Pessoa';
    document.getElementById('corretorForm').reset();
    document.getElementById('corretorId').value = '';
    document.getElementById('corretorModal').classList.add('show');
}

function editCorretor(corretor) {
    editingCorretor = corretor;
    document.getElementById('corretorModalTitle').textContent = 'Editar Pessoa';
    document.getElementById('corretorId').value = corretor.id;
    document.getElementById('corretorName').value = corretor.name;
    document.getElementById('corretorType').value = corretor.type;
    document.getElementById('corretorEmail').value = corretor.email || '';
    document.getElementById('corretorPhone').value = corretor.phone || '';
    document.getElementById('corretorModal').classList.add('show');
}

function closeCorretorModal() {
    document.getElementById('corretorModal').classList.remove('show');
    editingCorretor = null;
}

function deleteCorretor(corretorId) {
    if (!confirm('Tem certeza que deseja excluir esta pessoa?')) return;
    DB.client.from('corretores').delete().eq('id', corretorId).then(async ({error}) => {
        if (error) { alert('Erro ao excluir: ' + error.message); return; }
        await hydrateFromSupabase(); loadCorretores();
    });
}

document.getElementById('corretorForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const corretorId = document.getElementById('corretorId').value;
    const name = document.getElementById('corretorName').value.trim();
    const type = document.getElementById('corretorType').value;
    const email = document.getElementById('corretorEmail').value.trim();
    const phone = document.getElementById('corretorPhone').value.trim();
    let error;
    if (corretorId) {
        ({ error } = await DB.client.from('corretores').update({ nome:name, tipo:type, email, telefone:phone }).eq('id', corretorId));
    } else {
        ({ error } = await DB.client.from('corretores').insert({ id:'corretor_'+Date.now(), nome:name, tipo:type, email, telefone:phone }));
    }
    if (error) { alert('Erro ao salvar: ' + error.message); return; }
    await hydrateFromSupabase(); closeCorretorModal(); loadCorretores();
});

// ====================
// METAS
// ====================
function loadMetas() {
    const metas = JSON.parse(localStorage.getItem(CONFIG_KEYS.METAS) || '[]');
    const tbody = document.getElementById('metasTableBody');
    tbody.innerHTML = '';
    
    if (metas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#9e9e9e;">Nenhuma meta cadastrada</td></tr>';
        return;
    }
    
    // Ordenar por data (mais recente primeiro)
    metas.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    metas.forEach(meta => {
        const tr = document.createElement('tr');
        const startDate = new Date(meta.startDate + 'T00:00:00');
        const endDate = new Date(meta.endDate + 'T00:00:00');
        
        let status = '';
        let statusBadge = '';
        
        if (today < startDate) {
            status = 'Futura';
            statusBadge = '<span class="badge badge-info">Futura</span>';
        } else if (today > endDate) {
            status = 'Encerrada';
            statusBadge = '<span class="badge badge-danger">Encerrada</span>';
        } else {
            status = 'Vigente';
            statusBadge = '<span class="badge badge-success">Vigente</span>';
        }
        
        const periodo = `${formatDate(meta.startDate)} até ${formatDate(meta.endDate)}`;
        
        tr.innerHTML = `
            <td>${meta.period || periodo}</td>
            <td style="color: #2c6e2e; font-weight: 600;">${formatCurrency(meta.volumeGoal)}</td>
            <td style="color: #1976d2; font-weight: 600;">${formatCurrency(meta.commissionGoal)}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-secondary btn-small" onclick='editMeta(${JSON.stringify(meta)})'>Editar</button>
                <button class="btn btn-danger btn-small" onclick='deleteMeta("${meta.id}")'>Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openMetaModal() {
    editingMeta = null;
    document.getElementById('metaModalTitle').textContent = 'Adicionar Meta';
    document.getElementById('metaForm').reset();
    document.getElementById('metaId').value = '';
    document.getElementById('metaModal').classList.add('show');
}

function editMeta(meta) {
    editingMeta = meta;
    document.getElementById('metaModalTitle').textContent = 'Editar Meta';
    document.getElementById('metaId').value = meta.id;
    document.getElementById('metaStartDate').value = meta.startDate;
    document.getElementById('metaEndDate').value = meta.endDate;
    document.getElementById('metaVolume').value = meta.volumeGoal;
    document.getElementById('metaCommission').value = meta.commissionGoal;
    document.getElementById('metaModal').classList.add('show');
}

function closeMetaModal() {
    document.getElementById('metaModal').classList.remove('show');
    editingMeta = null;
}

function deleteMeta(metaId) {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return;
    DB.client.from('metas').delete().eq('id', metaId).then(async ({error}) => {
        if (error) { alert('Erro ao excluir: ' + error.message); return; }
        await hydrateFromSupabase(); loadMetas();
    });
}

document.getElementById('metaForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const metaId = document.getElementById('metaId').value;
    const startDate = document.getElementById('metaStartDate').value;
    const endDate = document.getElementById('metaEndDate').value;
    const volumeGoal = parseFloat(document.getElementById('metaVolume').value);
    const commissionGoal = parseFloat(document.getElementById('metaCommission').value);
    if (new Date(startDate) > new Date(endDate)) { alert('A data de início não pode ser maior que a data de fim!'); return; }
    const period = `${formatDate(startDate)} até ${formatDate(endDate)}`;
    const dados = { data_inicio:startDate, data_fim:endDate, meta_volume:volumeGoal, meta_comissao:commissionGoal, periodo_label:period };
    let error;
    if (metaId) {
        ({ error } = await DB.client.from('metas').update(dados).eq('id', metaId));
    } else {
        ({ error } = await DB.client.from('metas').insert({ id:'meta_'+Date.now(), ...dados }));
    }
    if (error) { alert('Erro ao salvar: ' + error.message); return; }
    await hydrateFromSupabase(); closeMetaModal(); loadMetas();
});

// ====================
// UTILS
// ====================
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
    }).format(value);
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Inicializar dados de exemplo
function initializeExampleData() {
    return; // dados vêm do Supabase
    // Corretores de exemplo
    const corretores = JSON.parse(localStorage.getItem(CONFIG_KEYS.CORRETORES) || '[]');
    if (corretores.length === 0) {
        const exampleCorretores = [
            { id: 'corretor_1', name: 'Mauro Reis', type: 'Corretor', email: 'mauro@acontece.com.br', phone: '(61) 99999-0001', createdAt: new Date().toISOString() },
            { id: 'corretor_2', name: 'João Vitor', type: 'Ambos', email: 'joao@acontece.com.br', phone: '(61) 99999-0002', createdAt: new Date().toISOString() },
            { id: 'corretor_3', name: 'Henrique Carvalho', type: 'Captador', email: 'henrique@acontece.com.br', phone: '(61) 99999-0003', createdAt: new Date().toISOString() },
            { id: 'corretor_4', name: 'Frederico Wanderley', type: 'Captador', email: 'frederico@acontece.com.br', phone: '(61) 99999-0004', createdAt: new Date().toISOString() },
            { id: 'corretor_5', name: 'Acontece', type: 'Captador', email: 'contato@acontece.com.br', phone: '(61) 99999-0000', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem(CONFIG_KEYS.CORRETORES, JSON.stringify(exampleCorretores));
    }
    
    // Meta de exemplo
    const metas = JSON.parse(localStorage.getItem(CONFIG_KEYS.METAS) || '[]');
    if (metas.length === 0) {
        const exampleMetas = [
            {
                id: 'meta_1',
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                volumeGoal: 10000000,
                commissionGoal: 350000,
                period: '01/01/2026 até 31/12/2026',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(CONFIG_KEYS.METAS, JSON.stringify(exampleMetas));
    }
}

// ====================
// IMÓVEIS CAPTADOS
// ====================
const DASHBOARD_KEY = 'dashboard_acontece_v5';
let editingImovel = null;
let allImoveis = []; // Cache de todos os imóveis

function loadImoveis() {
    // Buscar todos os imóveis de todos os meses
    const dashData = JSON.parse(localStorage.getItem(DASHBOARD_KEY) || '{}');
    allImoveis = [];
    
    for (const monthKey in dashData) {
        const capted = dashData[monthKey].capted || [];
        capted.forEach(imovel => {
            allImoveis.push({
                ...imovel,
                monthKey // Guardar referência do mês para poder atualizar depois
            });
        });
    }
    
    // Ordenar por data (mais recente primeiro)
    allImoveis.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA;
    });
    
    // Atualizar estatísticas
    updateImoveisStats();
    
    // Atualizar filtros de captadores
    updateCaptadoresFilter();
    
    // Renderizar tabela
    filterImoveis();
}

function updateImoveisStats() {
    const total = allImoveis.length;
    const disponiveis = allImoveis.filter(i => i.status === 'Disponível').length;
    const vendidos = allImoveis.filter(i => i.status === 'Vendido').length;
    const valorTotal = allImoveis
        .filter(i => i.status === 'Disponível')
        .reduce((sum, i) => sum + (i.price || 0), 0);
    
    document.getElementById('stats-imoveis-total').textContent = total;
    document.getElementById('stats-imoveis-disponiveis').textContent = disponiveis;
    document.getElementById('stats-imoveis-vendidos').textContent = vendidos;
    document.getElementById('stats-imoveis-valor').textContent = formatCurrency(valorTotal);
}

function updateCaptadoresFilter() {
    const captadores = [...new Set(allImoveis.map(i => i.captador))].sort();
    const select = document.getElementById('imovelCaptadorFilter');
    
    // Manter a primeira opção "Todos os Captadores"
    select.innerHTML = '<option value="">Todos os Captadores</option>';
    
    captadores.forEach(captador => {
        const option = document.createElement('option');
        option.value = captador;
        option.textContent = captador;
        select.appendChild(option);
    });
}

function filterImoveis() {
    const searchTerm = document.getElementById('imovelSearchInput').value.toLowerCase();
    const statusFilter = document.getElementById('imovelStatusFilter').value;
    const captadorFilter = document.getElementById('imovelCaptadorFilter').value;
    
    const filtered = allImoveis.filter(imovel => {
        const matchSearch = 
            !searchTerm ||
            imovel.code.toLowerCase().includes(searchTerm) ||
            imovel.address.toLowerCase().includes(searchTerm) ||
            imovel.captador.toLowerCase().includes(searchTerm);
        
        const matchStatus = !statusFilter || imovel.status === statusFilter;
        const matchCaptador = !captadorFilter || imovel.captador === captadorFilter;
        
        return matchSearch && matchStatus && matchCaptador;
    });
    
    renderImoveisTable(filtered);
}

function renderImoveisTable(imoveis) {
    const tbody = document.getElementById('imoveisTableBody');
    
    if (imoveis.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#9e9e9e;">Nenhum imóvel encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = imoveis.map(imovel => {
        const statusBadges = {
            'Disponível': '<span class="badge badge-success">Disponível</span>',
            'Vendido': '<span class="badge badge-info">Vendido</span>',
            'Suspenso': '<span class="badge badge-warning">Suspenso</span>'
        };
        
        // Contar quantas propostas este imóvel já tem
        const propostas = JSON.parse(localStorage.getItem('dashboard_propostas_global') || '[]');
        const qtdPropostas = propostas.filter(p => p.codigo_imovel === imovel.code).length;
        const indicadorPropostas = qtdPropostas > 0 ? `<span style="font-size:10px; color:#1976d2; font-weight:600;">📋 ${qtdPropostas}</span>` : '';
        
        return `
            <tr>
                <td>
                    <strong style="color: #2c6e2e;">${imovel.code}</strong>
                    ${indicadorPropostas ? '<br>' + indicadorPropostas : ''}
                </td>
                <td style="max-width: 300px;">
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${imovel.address}">
                        ${imovel.address}
                    </div>
                </td>
                <td style="font-weight: 600; color: #1976d2;">${formatCurrency(imovel.price)}</td>
                <td>${imovel.captador}</td>
                <td style="font-size: 13px;">${imovel.date}</td>
                <td>${statusBadges[imovel.status] || imovel.status}</td>
                <td>
                    <button 
                        class="btn btn-primary btn-small" 
                        onclick='abrirPropostaRapida(${JSON.stringify(imovel)})'
                        style="background:#2c6e2e; margin-right: 4px;"
                        title="Criar nova proposta para este imóvel"
                    >
                        📝 Proposta
                    </button>
                    <button class="btn btn-secondary btn-small" onclick='editImovel(${JSON.stringify(imovel)})' style="margin-right: 4px;">Editar</button>
                    <button class="btn btn-danger btn-small" onclick='deleteImovel("${imovel.code}", "${imovel.monthKey}")'>Excluir</button>
                </td>
            </tr>
        `;
    }).join('');
}

function openImovelModal() {
    editingImovel = null;
    document.getElementById('imovelModalTitle').textContent = 'Adicionar Imóvel';
    document.getElementById('imovelForm').reset();
    document.getElementById('imovelId').value = '';
    document.getElementById('imovelMonthKey').value = '';
    
    // Preencher select de captadores
    populateCaptadoresSelect();
    
    // Definir data padrão como hoje
    document.getElementById('imovelDate').valueAsDate = new Date();
    
    document.getElementById('imovelModal').classList.add('show');
}

function editImovel(imovel) {
    editingImovel = imovel;
    document.getElementById('imovelModalTitle').textContent = 'Editar Imóvel';
    document.getElementById('imovelId').value = imovel.code;
    document.getElementById('imovelMonthKey').value = imovel.monthKey;
    document.getElementById('imovelCode').value = imovel.code;
    document.getElementById('imovelAddress').value = imovel.address;
    document.getElementById('imovelPrice').value = imovel.price;
    document.getElementById('imovelDate').value = convertDateToInput(imovel.date);
    document.getElementById('imovelStatus').value = imovel.status;
    
    // Preencher select de captadores e selecionar o atual
    populateCaptadoresSelect();
    document.getElementById('imovelCaptador').value = imovel.captador;
    
    // Desabilitar edição do código (não pode mudar)
    document.getElementById('imovelCode').disabled = true;
    
    document.getElementById('imovelModal').classList.add('show');
}

function closeImovelModal() {
    document.getElementById('imovelModal').classList.remove('show');
    document.getElementById('imovelCode').disabled = false;
    editingImovel = null;
}

function populateCaptadoresSelect() {
    const corretores = JSON.parse(localStorage.getItem(CONFIG_KEYS.CORRETORES) || '[]');
    const select = document.getElementById('imovelCaptador');
    
    select.innerHTML = '<option value="">Selecione o captador</option>';
    
    corretores.forEach(corretor => {
        const option = document.createElement('option');
        option.value = corretor.name;
        option.textContent = corretor.name;
        select.appendChild(option);
    });
}

function deleteImovel(code, monthKey) {
    if (!confirm(`Tem certeza que deseja excluir o imóvel ${code}?

ATENÇÃO: Esta ação não pode ser desfeita!`)) return;
    DB.deleteImovel(code).then(async () => {
        await hydrateFromSupabase(); loadImoveis();
    }).catch(e => alert('Erro ao excluir: ' + (e.message||e)));
}

function exportarImoveis() {
    const searchTerm = document.getElementById('imovelSearchInput').value.toLowerCase();
    const statusFilter = document.getElementById('imovelStatusFilter').value;
    const captadorFilter = document.getElementById('imovelCaptadorFilter').value;
    
    const filtered = allImoveis.filter(imovel => {
        const matchSearch = 
            !searchTerm ||
            imovel.code.toLowerCase().includes(searchTerm) ||
            imovel.address.toLowerCase().includes(searchTerm) ||
            imovel.captador.toLowerCase().includes(searchTerm);
        
        const matchStatus = !statusFilter || imovel.status === statusFilter;
        const matchCaptador = !captadorFilter || imovel.captador === captadorFilter;
        
        return matchSearch && matchStatus && matchCaptador;
    });
    
    // Criar CSV
    let csv = 'Código,Endereço,Valor (R$),Captador,Data Cadastro,Status\n';
    filtered.forEach(imovel => {
        csv += `"${imovel.code}","${imovel.address}",${imovel.price},"${imovel.captador}","${imovel.date}","${imovel.status}"\n`;
    });
    
    // Fazer download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imoveis_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Formulário de imóvel
document.getElementById('imovelForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const code = document.getElementById('imovelCode').value.trim().toUpperCase();
    const address = document.getElementById('imovelAddress').value.trim();
    const price = parseFloat(document.getElementById('imovelPrice').value);
    const date = document.getElementById('imovelDate').value;
    const captador = document.getElementById('imovelCaptador').value;
    const status = document.getElementById('imovelStatus').value;
    try {
        if (editingImovel) {
            await DB.updateImovel(code, { address, captador, dateIso:date, price, status });
        } else {
            if (await DB.codigoExiste(code)) { alert(`O código ${code} já está cadastrado! Use um código diferente.`); return; }
            await DB.addImovel({ code, address, captador, dateIso:date, price, status });
        }
        await hydrateFromSupabase(); closeImovelModal(); loadImoveis();
    } catch (err) { alert('Erro ao salvar: ' + (err.message||err)); }
});

// Funções auxiliares
function parseDate(dateStr) {
    // Converte "15/05/2026" para Date object
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(0);
}

function convertDateToInput(dateStr) {
    // Converte "15/05/2026" para "2026-05-15"
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return '';
}

function convertDateToDisplay(dateStr) {
    // Converte "2026-05-15" para "15/05/2026"
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return '';
}

// ====================
// PROPOSTA RÁPIDA A PARTIR DO IMÓVEL
// ====================
let imovelSelecionadoProposta = null;

function abrirPropostaRapida(imovel) {
    alert('A criação de propostas será feita na tela Propostas (em conversão). Em breve!');
    return;
    // Validar se imóvel está disponível
    if (imovel.status !== 'Disponível') {
        const confirmar = confirm(
            `⚠️ ATENÇÃO!\n\n` +
            `Este imóvel está com status "${imovel.status}".\n\n` +
            `Deseja criar uma proposta mesmo assim?`
        );
        if (!confirmar) return;
    }
    
    // Salvar imóvel selecionado
    imovelSelecionadoProposta = imovel;
    
    // Limpar formulário
    document.getElementById('propostaRapidaForm').reset();
    
    // Pré-preencher dados do imóvel
    document.getElementById('pr_codigoImovel').value = imovel.code;
    document.getElementById('pr_endereco').value = imovel.address;
    document.getElementById('pr_valorAnuncio').value = formatCurrency(imovel.price);
    document.getElementById('pr_captador').value = imovel.captador;
    document.getElementById('pr_statusImovel').value = imovel.status;
    
    // Carregar lista de corretores
    carregarCorretoresProposta();
    
    // Esconder info de desconto
    document.getElementById('pr_infoDesconto').style.display = 'none';
    
    // Abrir modal
    document.getElementById('propostaRapidaModal').classList.add('show');
}

function carregarCorretoresProposta() {
    const corretores = JSON.parse(localStorage.getItem(CONFIG_KEYS.CORRETORES) || '[]');
    const select = document.getElementById('pr_corretor');
    
    select.innerHTML = '<option value="">Selecione o corretor</option>';
    
    // Filtrar apenas corretores (não apenas captadores)
    const corretoresAtivos = corretores.filter(c => 
        c.type === 'Corretor' || c.type === 'Ambos'
    );
    
    corretoresAtivos.forEach(corretor => {
        const option = document.createElement('option');
        option.value = JSON.stringify({ id: corretor.id, name: corretor.name });
        option.textContent = corretor.name;
        select.appendChild(option);
    });
}

function calcularDescontoProposta() {
    if (!imovelSelecionadoProposta) return;
    
    const valorProposta = parseFloat(document.getElementById('pr_valorProposta').value);
    const valorAnuncio = imovelSelecionadoProposta.price;
    
    if (!valorProposta || valorProposta <= 0) {
        document.getElementById('pr_infoDesconto').style.display = 'none';
        return;
    }
    
    const diferenca = valorProposta - valorAnuncio;
    const percentual = ((diferenca / valorAnuncio) * 100).toFixed(2);
    
    let texto = '';
    let cor = '';
    
    if (diferenca < 0) {
        texto = `Desconto de ${Math.abs(percentual)}% (R$ ${formatCurrency(Math.abs(diferenca))} abaixo do anúncio)`;
        cor = '#2c6e2e';
    } else if (diferenca > 0) {
        texto = `Acréscimo de ${percentual}% (R$ ${formatCurrency(diferenca)} acima do anúncio)`;
        cor = '#f57c00';
    } else {
        texto = `Proposta igual ao valor de anúncio`;
        cor = '#1976d2';
    }
    
    const infoDiv = document.getElementById('pr_infoDesconto');
    const textoDiv = document.getElementById('pr_textoDesconto');
    
    infoDiv.style.display = 'block';
    infoDiv.style.background = cor + '15';
    textoDiv.style.color = cor;
    textoDiv.innerHTML = texto;
}

function fecharPropostaRapida() {
    document.getElementById('propostaRapidaModal').classList.remove('show');
    imovelSelecionadoProposta = null;
}

function gerarProtocoloProposta() {
    const ano = new Date().getFullYear();
    const propostas = JSON.parse(localStorage.getItem('dashboard_propostas_global') || '[]');
    
    // Pegar o maior número de protocolo do ano atual
    const protocolosAno = propostas
        .map(p => p.protocolo)
        .filter(p => p && p.startsWith(`ACONTECE-${ano}-`))
        .map(p => parseInt(p.split('-')[2]))
        .filter(n => !isNaN(n));
    
    const maiorNumero = protocolosAno.length > 0 ? Math.max(...protocolosAno) : 0;
    const proximoNumero = String(maiorNumero + 1).padStart(4, '0');
    
    return `ACONTECE-${ano}-${proximoNumero}`;
}

function calcularNumeroOrdemProposta(codigoImovel) {
    const propostas = JSON.parse(localStorage.getItem('dashboard_propostas_global') || '[]');
    const propostasDoImovel = propostas.filter(p => p.codigo_imovel === codigoImovel);
    return propostasDoImovel.length + 1;
}

// Listener do formulário de proposta rápida
document.getElementById('propostaRapidaForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!imovelSelecionadoProposta) {
        alert('❌ Erro: Dados do imóvel não encontrados. Por favor, feche e abra novamente.');
        return;
    }
    
    // Coletar dados do formulário
    const clienteNome = document.getElementById('pr_clienteNome').value.trim();
    const clienteTelefone = document.getElementById('pr_clienteTelefone').value.trim();
    const clienteEmail = document.getElementById('pr_clienteEmail').value.trim();
    
    const corretorData = document.getElementById('pr_corretor').value;
    if (!corretorData) {
        alert('❌ Por favor, selecione um corretor responsável.');
        return;
    }
    
    const corretor = JSON.parse(corretorData);
    const valorProposta = parseFloat(document.getElementById('pr_valorProposta').value);
    const observacoes = document.getElementById('pr_observacoes').value.trim();
    
    // Validações
    if (!clienteNome) {
        alert('❌ Por favor, informe o nome do cliente.');
        return;
    }
    
    if (!valorProposta || valorProposta <= 0) {
        alert('❌ Por favor, informe um valor válido para a proposta.');
        return;
    }
    
    // Calcular valores
    const valorAnuncio = imovelSelecionadoProposta.price;
    const descontoPercentual = ((valorProposta - valorAnuncio) / valorAnuncio * 100).toFixed(2);
    const comissaoEstimada = valorProposta * 0.05;
    const numeroOrdem = calcularNumeroOrdemProposta(imovelSelecionadoProposta.code);
    
    // Criar estrutura completa da proposta
    const novaProposta = {
        id: 'prop_' + Date.now(),
        protocolo: gerarProtocoloProposta(),
        codigo_imovel: imovelSelecionadoProposta.code,
        numero_ordem: numeroOrdem,
        data_hora_registro: new Date().toISOString(),
        
        // Corretor
        corretor_id: corretor.id,
        corretor_nome: corretor.name,
        
        // Imóvel
        imovel: {
            codigo: imovelSelecionadoProposta.code,
            endereco: imovelSelecionadoProposta.address,
            valor_anuncio: valorAnuncio,
            captador: imovelSelecionadoProposta.captador,
            status: imovelSelecionadoProposta.status
        },
        
        // Cliente
        cliente: {
            nome: clienteNome,
            telefone: clienteTelefone,
            email: clienteEmail
        },
        
        // Valores
        valor_proposto: valorProposta,
        desconto_percentual: descontoPercentual,
        comissao_estimada: comissaoEstimada,
        
        // Status
        status: 'nova',
        tem_prioridade: numeroOrdem === 1,
        
        // Observações
        observacoes: observacoes,
        
        // Timeline de negociação
        negociacoes: [
            {
                id: 'neg_001',
                tipo: 'proposta_inicial',
                quem: 'cliente',
                valor: valorProposta,
                data: new Date().toISOString(),
                observacoes: observacoes || 'Proposta inicial criada',
                usuario: 'Sistema',
                aguardando_resposta: 'proprietario'
            }
        ]
    };
    
    // Salvar proposta
    let propostas = JSON.parse(localStorage.getItem('dashboard_propostas_global') || '[]');
    propostas.push(novaProposta);
    localStorage.setItem('dashboard_propostas_global', JSON.stringify(propostas));
    
    // Feedback de sucesso
    const mensagemSucesso = 
        `✅ PROPOSTA CRIADA COM SUCESSO!\n\n` +
        `Protocolo: ${novaProposta.protocolo}\n` +
        `Imóvel: ${imovelSelecionadoProposta.code}\n` +
        `Cliente: ${clienteNome}\n` +
        `Valor: ${formatCurrency(valorProposta)}\n` +
        `Ordem: #${numeroOrdem}${numeroOrdem === 1 ? ' (PRIMEIRA PROPOSTA)' : ''}\n\n` +
        `A proposta foi adicionada ao pipeline e está disponível na tela de Propostas.`;
    
    alert(mensagemSucesso);
    
    // Fechar modal
    fecharPropostaRapida();
    
    // Recarregar lista de imóveis (para atualizar contador de propostas)
    loadImoveis();
});

// ===== Supabase: popula o localStorage (cache de leitura) =====
async function hydrateFromSupabase() {
    const [imoveis, vendas, corretores, metas] = await Promise.all([
        DB.listImoveis(), DB.listVendas(), DB.listCorretores(), DB.listMetas()
    ]);
    const v5 = {};
    const ensure = m => (v5[m] = v5[m] || { sales: [], capted: [] });
    imoveis.forEach(i => { if (i.mes) ensure(i.mes).capted.push({ code:i.code, address:i.address, captador:i.captador, date:i.date, price:i.price, status:i.status }); });
    vendas.forEach(s => { if (s.mes) ensure(s.mes).sales.push({ code:s.code, address:s.address, captador:s.captador, corretor:s.corretor, date:s.date, value:s.value, commission:s.commission }); });
    localStorage.setItem('dashboard_acontece_v5', JSON.stringify(v5));
    localStorage.setItem('dashboard_corretores', JSON.stringify(corretores.map(c => ({ id:c.id, name:c.name, type:c.type, email:c.email, phone:c.phone }))));
    localStorage.setItem('dashboard_metas', JSON.stringify(metas.map(mt => ({ id:mt.id, startDate:mt.data_inicio, endDate:mt.data_fim, volumeGoal:Number(mt.meta_volume)||0, commissionGoal:Number(mt.meta_comissao)||0, period:mt.periodo_label }))));
}

function logout() { if (confirm('Tem certeza que deseja sair?')) DB.signOut(); }

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    await DB.requireAuth();
    const user = await DB.getUser();
    const nameEl = document.getElementById('currentUserName');
    if (user && nameEl) nameEl.textContent = user.email;
    await hydrateFromSupabase();
    loadUsers();
});
