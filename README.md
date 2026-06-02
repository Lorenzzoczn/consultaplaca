# 🚗 ConsultaPlaca

Plataforma SaaS premium de consulta veicular brasileira. Design moderno com identidade visual preta e amarela, inspirado em dashboards automotivos de alto padrão.

## ✨ Funcionalidades

- **Consulta de placas** — Retorna dados completos do veículo (marca, modelo, ano, cor, chassi mascarado, RENAVAM mascarado, FIPE, ficha técnica)
- **Autenticação JWT** com controle de sessão
- **Histórico de consultas** com paginação
- **Painel administrativo** — Estatísticas, gerenciamento de usuários, logs
- **Controle de cotas** — Limite de consultas por usuário
- **Rate limiting** — Proteção contra abuso
- **Design premium** — Glassmorphism, animações Framer Motion, totalmente responsivo

## 🛠 Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14, React, TailwindCSS, Framer Motion |
| Backend | Node.js, Express |
| Banco | PostgreSQL + Prisma ORM |
| Auth | JWT + Sessions |
| Deploy | Vercel (frontend) + Render (backend) |

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edite .env com suas configurações

npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
# Edite .env.local

npm install
npm run dev
```

### 3. Docker (alternativa)

```bash
docker-compose up -d
```

## 🔑 Credenciais padrão

| Usuário | Email | Senha |
|---------|-------|-------|
| Admin | admin@consultaplaca.com | Admin@123456 |
| Demo | demo@consultaplaca.com | Demo@123456 |

## 🔌 Integração com API Veicular

O sistema usa uma camada de serviço desacoplada em `backend/src/services/vehicleService.js`.

Para integrar com seu provedor de API:

1. Configure as variáveis no `.env`:
```env
VEHICLE_API_URL=https://sua-api.com/v1
VEHICLE_API_KEY=sua_chave
VEHICLE_API_TOKEN=seu_token
```

2. Adapte o método `_normalizeApiResponse()` no `vehicleService.js` para o formato da sua API.

**Provedores compatíveis:** ApiPlacas, ConsultaPlacas, PlacaFipe, Detran APIs, entre outros.

Em modo `development` sem API configurada, o sistema retorna dados mock para demonstração.

## 📁 Estrutura

```
consultaplaca/
├── frontend/               # Next.js App
│   └── src/
│       ├── app/            # App Router (pages)
│       │   ├── (auth)/     # Login, Register, Forgot Password
│       │   └── (dashboard)/# Dashboard, Consulta, Histórico, Admin
│       ├── components/     # Componentes reutilizáveis
│       ├── hooks/          # useAuth
│       ├── lib/            # API client, utils
│       └── styles/         # CSS global
│
├── backend/                # Express API
│   └── src/
│       ├── controllers/    # Auth, Consulta, Admin
│       ├── middleware/     # Auth, Rate Limit, Error Handler
│       ├── routes/         # Rotas organizadas
│       ├── services/       # VehicleService (desacoplado)
│       └── config/         # DB, Logger
│
├── docker-compose.yml
└── README.md
```

## 🔒 Segurança

- JWT com expiração + invalidação de sessão
- Rate limiting por IP e por usuário
- Helmet.js para headers de segurança
- Validação de entrada com express-validator
- Dados sensíveis mascarados (chassi, RENAVAM)
- CORS configurado

## 🌐 Deploy

### Render (Backend)
1. Crie um Web Service apontando para `/backend`
2. Configure as variáveis de ambiente
3. Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
4. Start command: `npm start`

### Vercel (Frontend)
1. Importe o repositório
2. Root directory: `frontend`
3. Configure `NEXT_PUBLIC_API_URL` com a URL do backend no Render
