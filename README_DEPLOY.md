# Dashboard Acontece — Publicação no GitHub Pages + Supabase

Front-end estático (GitHub Pages) + banco compartilhado (Supabase / PostgreSQL).
Todos da equipe acessam o **mesmo** banco, ao vivo, com login.

---

## Arquivos do repositório

| Arquivo | Função |
|---|---|
| `login.html` | Tela de login (autenticação Supabase) |
| `CadastroImovel.html` | Formulário de cadastro de imóveis (grava no Supabase) |
| `db-supabase.js` | Camada de acesso a dados — **substitui o localStorage** |
| `supabase_schema_vendas.sql` | Esquema do banco (rodar uma vez no Supabase) |
| `Logo01.png` | Logo |
| `seed/migrar_backup.py` | Carga inicial dos dados a partir do backup JSON |
| `seed/acontece_backup_*.json` | Backup mais recente do app antigo |

---

## Passo a passo (uma vez)

### 1. Criar o projeto no Supabase
1. Acesse https://supabase.com e crie um projeto (plano free).
2. Anote a senha do banco (usada no passo 5).

### 2. Criar o banco
1. No Supabase: **SQL Editor → New query**.
2. Cole **todo** o conteúdo de `supabase_schema_vendas.sql` e clique em **Run**.

### 3. Expor o schema `vendas` na API  *(passo crítico)*
- **Settings → API → Exposed schemas** → adicione `vendas` → **Save**.
- Sem isso a API REST não enxerga as tabelas.

### 4. Ligar as chaves no front
1. **Settings → API**, copie **Project URL** e a chave **anon public**.
2. Abra `db-supabase.js` e preencha:
   ```js
   const SUPABASE_URL      = 'https://SEU-PROJETO.supabase.co';
   const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_PUBLICA_AQUI';
   ```
> A chave **anon** pode ficar pública no GitHub — o RLS bloqueia tudo sem login.
> **Nunca** coloque a chave `service_role` no front.

### 5. Carregar os dados existentes (opcional)
No seu PC, com Python:
```bash
pip install psycopg2-binary

# Supabase: Settings → Database → Connection string (modo "Session pooler")
export PGHOST=db.SEU-PROJETO.supabase.co
export PGPORT=5432
export PGDATABASE=postgres
export PGUSER=postgres
export PGPASSWORD=SUA_SENHA_DO_BANCO

python seed/migrar_backup.py seed/acontece_backup_2026-06-03_0940.json
```
Carrega corretores, metas, imóveis, vendas, propostas e negociações.

### 6. Criar os usuários da equipe
- **Authentication → Users → Add user** (e-mail + senha) para cada pessoa.
- Recomendado: **Authentication → Providers → Email** → desligar *Confirm email*,
  assim o usuário entra na hora, sem precisar confirmar e-mail.

### 7. Publicar no GitHub Pages
1. Crie o repositório e suba todos os arquivos.
2. **Settings → Pages → Branch: `main` / `(root)` → Save**.
3. Em ~1 min o app fica em `https://SEU-USUARIO.github.io/SEU-REPO/login.html`.

---

## Como funciona a segurança
- O front usa só a chave **anon** (pública).
- **RLS** está ligado em todas as tabelas: sem login, nada é lido nem gravado.
- Após o login, o Supabase emite um token; aí o papel passa a `authenticated`,
  que tem acesso total (políticas `acesso_autenticado`).
- Resultado: o link pode ser público, mas só quem tem usuário entra.

---

## Falta converter (próximo passo)
`CadastroImovel.html` e `login.html` já usam o Supabase. As telas grandes
(`Dash5.html`, `Propostas.html`, `Relatorios.html`, `Configuracoes.html`)
ainda leem `localStorage`. Para migrá-las, troca-se cada
`localStorage.getItem/setItem` pelas funções já prontas em `db-supabase.js`
(`DB.listImoveis`, `DB.listVendas`, `DB.listPropostas`, `DB.listCorretores`,
`DB.listMetas`, etc.). Posso fazer essa conversão página por página.
```
```
