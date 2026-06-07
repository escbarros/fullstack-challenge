# Crash Game — Jungle Gaming

Plataforma multiplayer de crash game em tempo real. Um multiplicador sobe a partir de `1.00×` e pode crashar a qualquer momento. Jogadores apostam antes da rodada e precisam sacar antes do crash para garantir os ganhos.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Tech Stack](#tech-stack)
- [Funcionalidades](#funcionalidades)
- [Setup & Execução](#setup--execução)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Algoritmo Provably Fair](#algoritmo-provably-fair)
- [Testes](#testes)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Decisões Arquiteturais e Trade-offs](#decisões-arquiteturais-e-trade-offs)

---

## Arquitetura

```
Browser → Kong → game-service | wallet-service
                                       ↕ RabbitMQ ↕
```

Dois microserviços NestJS independentes comunicando-se de forma assíncrona via RabbitMQ, expostos por um API Gateway Kong. Keycloak gerencia toda a autenticação via OIDC/PKCE.

```
                     ┌──────────────────────────┐
                     │        Frontend           │
                     │  TanStack Start + React   │
                     └─────┬────────────┬────────┘
                        HTTP/REST    WebSocket
                             │            │
                     ┌───────▼────────────▼───────┐
                     │           Kong              │
                     │       (API Gateway)         │
                     └───────┬────────────┬────────┘
                             │            │
                 ┌───────────▼──┐   ┌─────▼──────────┐
                 │ game-service │   │ wallet-service  │
                 │   :4001      │   │     :4002       │
                 └──────┬───────┘   └────────┬────────┘
                        │                    │
                 ┌──────▼──────┐   ┌─────────▼──────┐
                 │ PostgreSQL  │   │   RabbitMQ      │
                 │   games DB  │   │  (mensageria)   │
                 └─────────────┘   └────────────────┘
                 ┌─────────────┐
                 │  Keycloak   │
                 │  (OIDC/IdP) │
                 └─────────────┘
```

### Serviços

| Serviço | Porta | Banco | Responsabilidade |
|---------|-------|-------|-----------------|
| `game-service` | 4001 | `games` (PostgreSQL) | Ciclo de vida de rodadas, apostas, cashout, WebSocket, provably fair |
| `wallet-service` | 4002 | `wallets` (PostgreSQL) | Saldo do jogador, débito/crédito via RabbitMQ |
| Kong | 8000 | DB-less | roteamento) |
| Keycloak | 8081 | interno | OIDC/PKCE, realm `crash-game` |
| RabbitMQ | 5672 / 15672 | — | Mensageria assíncrona entre serviços |
| PostgreSQL | 5432 | `games` + `wallets` | Persistência dos dois serviços |

### Padrões de Comunicação

| Padrão | Uso |
|--------|-----|
| **REST** | Ações do jogador (apostar, cashout, consultar saldo) via Kong |
| **RabbitMQ** | Operações financeiras entre serviços: `wallet.debit`, `wallet.credit` e respostas |
| **WebSocket (Socket.IO)** | Push server → client exclusivamente. Room: `game` |
| **Outbox Pattern** | Insert da aposta + mensagem de outbox na mesma transação DB. Poller publica no RabbitMQ |
| **Idempotência** | Wallet Service usa `betId`/`cashoutId` como chave de idempotência para evitar double-spend |

---

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Bun |
| Backend | NestJS, TypeScript strict mode |
| ORM | MikroORM 6 (Unit of Work, auto-flush transactions) |
| Banco de Dados | PostgreSQL 18, BIGINT cents para valores monetários |
| Mensageria | RabbitMQ 4.2.4 (at-least-once delivery) |
| API Gateway | Kong 3.9.1 (DB-less, declarativo) |
| Auth | Keycloak 26.5.5 (OIDC + PKCE), oidc-client-ts |
| WebSocket | Socket.IO 4 |
| Frontend | TanStack Start, React |
| Estado | Zustand (game state) + TanStack Query (server state) |
| Estilo | Tailwind CSS v4 + shadcn/ui + sistema de design Jungle |
| Testes | Vitest + @nestjs/testing |
| Infra | Docker Compose |

---

## Funcionalidades

### Game Service

- **Ciclo completo de rodada** — máquina de estados `BETTING → ACTIVE → CRASHED`
- **Fase de apostas** — janela de 10s com validação de aposta única por rodada
- **Multiplicador em tempo real** — tick a cada ~1s via WebSocket, calculado por `e^(elapsed × growthRate)`
- **Cashout** — com proteção de race condition via `SELECT ... FOR UPDATE`
- **Liquidação automática** — apostas não sacadas marcadas como `LOST` ao crashar
- **Histórico de rodadas** — listagem paginada com dados de verificação
- **Provably Fair** — geração e verificação de crash point via HMAC-SHA256
- **Outbox Pattern** — garante entrega at-least-once para o broker sem transações distribuídas

### Wallet Service

- **Carteira por jogador** — uma carteira por `playerId`, criação via REST
- **Operações financeiras apenas via RabbitMQ** — sem endpoint REST de débito/crédito
- **Idempotência** — tabela `wallet_transactions` com `idempotencyKey` único previne double-spend
- **Audit trail** — cada operação registra saldo antes/depois
- **BIGINT cents** — nenhum float em valores monetários

### Frontend

- **Autenticação OIDC/PKCE** — redirect para Keycloak, callback handler, renovação automática de token
- **Conexão WebSocket** — auto-reconexão com rehidratação de estado via REST
- **Multiplier animation** — `requestAnimationFrame` com fórmula `e^(elapsed × growthRate)`, correção de drift por eventos `round:tick`
- **Painel de apostas** — input validado, botões de atalho (+10, +50, +100, +500, Max, 2×, %)
- **Lista de apostas em tempo real** — atualização instantânea via WebSocket
- **Histórico de rodadas** — pills coloridos por faixa de crash point (heat scale)
- **Verificação provably fair** — modal com dados de seed e hash para auditoria
- **Dark mode** — design system Jungle (fundo escuro, acentos neon/lime)
- **Responsivo** — layout adaptado para desktop e mobile

### Máquinas de Estado

**Round:**
```
BETTING → ACTIVE → CRASHED
```

**Bet:**
```
PENDING → CONFIRMED → CASHEDOUT | LOST
PENDING → CANCELLED  (timeout de débito)
```

---

## Setup & Execução

### Pré-requisitos

- [Bun](https://bun.sh) >= 1.x
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

### Subir tudo

**1. Copie os arquivos de ambiente:**

```bash
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
cp frontend/.env.example frontend/.env
```

**2. Instale as dependências e suba os containers:**

```bash
git clone <repo-url>
cd fullstack-challenge
bun install
bun run docker:up
```

O comando sobe em ordem:
1. PostgreSQL (cria databases `games` e `wallets`)
2. RabbitMQ
3. Keycloak (importa realm `crash-game` automaticamente)
4. Kong (configuração declarativa)
5. Migrations do game-service
6. Migrations do wallet-service
7. game-service e wallet-service

Nenhum passo manual é necessário.

### Outros comandos

```bash
bun run docker:down    # Para os containers
bun run docker:prune   # Remove tudo (containers, volumes, imagens)
```

### Frontend (dev local)

```bash
cd frontend
bun install
bun run dev            # http://localhost:3000
```

### Usuário de teste

| Campo | Valor |
|-------|-------|
| Keycloak Admin | http://localhost:8081 (`admin` / `admin`) |
| Usuário de jogo | `player` / `player123` |
| Realm | `crash-game` |
| Client ID | `crash-game-client` (public, PKCE S256) |

> O usuário `player` já vem pré-configurado no realm. Crie a carteira via `POST /wallets` após o primeiro login.

---

## Variáveis de Ambiente

### Game Service (`services/games/.env`)

| Variável | Valor dev |
|----------|-----------|
| `PORT` | `4001` |
| `DATABASE_URL` | `postgresql://admin:admin@localhost:5432/games` |
| `RABBITMQ_URL` | `amqp://admin:admin@localhost:5672` |
| `GROWTH_RATE` | `0.00006` |
| `BETTING_PHASE_DURATION_MS` | `10000` |

### Wallet Service (`services/wallets/.env`)

| Variável | Valor dev |
|----------|-----------|
| `PORT` | `4002` |
| `DATABASE_URL` | `postgresql://admin:admin@localhost:5432/wallets` |
| `RABBITMQ_URL` | `amqp://admin:admin@localhost:5672` |

### Frontend (`frontend/.env`)

| Variável | Valor dev |
|----------|-----------|
| `VITE_API_BASE_URL` | `http://localhost:8000` |
| `VITE_KEYCLOAK_URL` | `http://localhost:8081` |
| `VITE_KEYCLOAK_REALM` | `crash-game` |
| `VITE_KEYCLOAK_CLIENT_ID` | `crash-game-client` |
| `VITE_GROWTH_RATE` | `0.00006` |

---

## API Reference

Todos os endpoints REST são acessados via **Kong** (`http://localhost:8000`).

### Wallet Service — `/wallets`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| `POST` | `/wallets` | Sim | Cria carteira para o jogador autenticado |
| `GET` | `/wallets/me` | Sim | Retorna carteira e saldo do jogador |

> Crédito e débito não são expostos via REST — ocorrem exclusivamente via RabbitMQ.

**Exemplo — Consultar saldo:**
```bash
curl http://localhost:8000/wallets/me \
  -H "Authorization: Bearer <token>"
```
```json
{
  "data": {
    "id": "uuid",
    "playerId": "uuid",
    "balanceCents": 100000
  }
}
```

### Game Service — `/games`

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| `GET` | `/games/rounds/current` | Não | Estado da rodada atual com apostas |
| `GET` | `/games/rounds/history` | Não | Histórico paginado de rodadas |
| `GET` | `/games/rounds/:roundId/verify` | Não | Dados de verificação provably fair |
| `GET` | `/games/bets/me` | Sim | Histórico de apostas do jogador |
| `POST` | `/games/bet` | Sim | Fazer aposta na rodada atual |
| `POST` | `/games/bet/cashout` | Sim | Sacar no multiplicador atual |

**Exemplo — Apostar:**
```bash
curl -X POST http://localhost:8000/games/bet \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "amountCents": 5000 }'
```

**Exemplo — Cashout:**
```bash
curl -X POST http://localhost:8000/games/bet/cashout \
  -H "Authorization: Bearer <token>"
```

**Exemplo — Verificar rodada:**
```bash
curl http://localhost:8000/games/rounds/<roundId>/verify
```
```json
{
  "data": {
    "roundId": "uuid",
    "seedHash": "abc123...",
    "serverSeed": "def456...",
    "clientSeed": "789xyz...",
    "crashPoint": 2.47
  }
}
```

### Swagger / OpenAPI

Documentação interativa disponível em:
- `http://localhost:4001/api` — game-service
- `http://localhost:4002/api` — wallet-service

---

## WebSocket Events

Conexão: `ws://localhost:8000` (via Kong), path `/socket.io`, room `game`.

O WebSocket é **exclusivamente server → client**. Todas as ações do jogador ocorrem via REST.

| Evento | Direção | Payload | Descrição |
|--------|---------|---------|-----------|
| `round:betting` | Server → Client | `{ roundId, seedHash, bettingEndsAt }` | Nova rodada criada, fase de apostas aberta |
| `round:started` | Server → Client | `{ roundId, startedAt }` | Fase ativa iniciada, multiplicador começa a subir |
| `round:tick` | Server → Client | `{ roundId, elapsedMs }` | Tick periódico para correção de drift do multiplier |
| `round:crashed` | Server → Client | `{ roundId, crashPoint, serverSeed, clientSeed }` | Rodada crashou; seeds revelados para verificação |
| `round:bet` | Server → Client | `{ roundId, betId, playerId, username, amountCents, status }` | Aposta confirmada |
| `round:cashout` | Server → Client | `{ roundId, playerId, username, cashoutMultiplier, payoutCents }` | Jogador sacou |
| `bet:cancelled` | Server → Client | `{ roundId, betId, playerId }` | Aposta cancelada por timeout de débito |

**Sequência de eventos de uma rodada:**
```
round:betting  → { roundId, seedHash, bettingEndsAt: "2024-01-01T00:00:10Z" }
round:bet      → { playerId: "p1", amountCents: 5000, username: "player" }
round:started  → { roundId, startedAt: "2024-01-01T00:00:10Z" }
round:tick     → { elapsedMs: 1000 }   (a cada ~1s)
round:cashout  → { playerId: "p1", cashoutMultiplier: 2.35, payoutCents: 11750 }
round:crashed  → { crashPoint: 3.14, serverSeed: "...", clientSeed: "..." }
```

---

## Algoritmo Provably Fair

O crash point de cada rodada é **pré-determinado e verificável** antes das apostas. Nenhum valor é manipulado após os jogadores apostarem.

### Como funciona

1. **Antes da fase de apostas** — o servidor gera `serverSeed` (64 hex chars, aleatório) e `clientSeed` (32 hex chars, aleatório), e publica o hash SHA-256 do server seed (`seedHash`) no evento `round:betting`.

2. **Fase de apostas** — o `serverSeed` permanece secreto. Os jogadores veem apenas o `seedHash`, confirmando que o resultado já foi comprometido.

3. **Crash** — o servidor revela `serverSeed` e `clientSeed` no evento `round:crashed`.

4. **Verificação** — qualquer jogador pode calcular o crash point independentemente com os dados revelados.

### Fórmula

```
HOUSE_EDGE = 0.01  (1% de edge da casa)

hmac = HMAC-SHA256(key=serverSeed, data=clientSeed)
h    = parseInt(hmac[0..7], 16)   // primeiros 4 bytes como uint32

raw        = (2^32 / (h + 1)) × (1 - HOUSE_EDGE)
crashPoint = floor(max(1.00, raw) × 100) / 100
```

### Verificação independente

```js
const { createHmac, createHash } = require('crypto');

function verifyCrashPoint(serverSeed, clientSeed, seedHash, crashPoint) {
  // 1. Confirmar que o seed hash bate (prova que o seed não foi trocado)
  const hashMatches =
    createHash('sha256').update(serverSeed).digest('hex') === seedHash;

  // 2. Recalcular o crash point
  const hmac = createHmac('sha256', serverSeed).update(clientSeed).digest('hex');
  const h = parseInt(hmac.slice(0, 8), 16);
  const raw = (Math.pow(2, 32) / (h + 1)) * 0.99;
  const computed = Math.floor(Math.max(1, raw) * 100) / 100;

  return hashMatches && computed === crashPoint;
}
```

### Multiplicador em tempo real

O multiplicador nunca é armazenado — é calculado a partir do `startedAt`:

```
multiplier = e^(elapsed_seconds × GROWTH_RATE)
```

Onde `GROWTH_RATE = 0.00006`. O frontend recalcula a cada frame via `requestAnimationFrame`. O servidor emite `round:tick` periodicamente apenas para correção de drift de clock.

---

## Testes

### Executar testes unitários

```bash
# Game Service
cd services/games
bun test tests/unit

# Wallet Service
cd services/wallets
bun test tests/unit
```

### Executar testes E2E

```bash
# Requer docker:up rodando
cd services/games
bun test tests/e2e
```

## Decisões Arquiteturais e Trade-offs

### 1. Outbox Pattern em vez de dual-write

**Decisão:** A aposta é persistida e a mensagem de débito (`wallet.debit`) é inserida na tabela `outbox` dentro da mesma transação de banco de dados. Um poller publica as mensagens pendentes no RabbitMQ.

**Por quê:** Garante consistência entre o banco local e o broker sem transações distribuídas (2PC). Se o serviço reiniciar após inserir a aposta mas antes de publicar no broker, o poller vai reprocessar na próxima execução. O único custo é latência de ~1s para publicação.

**Trade-off:** Adiciona complexidade (tabela extra, poller separado). A alternativa seria aceitar o risco de perder mensagens em caso de falha entre o commit e o publish — inaceitável para operações financeiras.

---

### 2. Race condition de cashout resolvida pelo banco

**Decisão:** O caso de corrida entre cashout e crash é resolvido via `SELECT ... FOR UPDATE` na linha do round. Quem adquirir o lock primeiro vence.

**Por quê:** O banco é o árbitro de verdade — elimina ambiguidade e lógica de retry no serviço. A alternativa seria um sistema de lock distribuído (Redis SETNX), que adiciona uma dependência de infra e novos pontos de falha.

**Trade-off:** Contention de lock em rodadas com alto volume de cashouts simultâneos. Em escala, poderia ser mitigado com sharding por round.

---

### 3. Entity = ORM Entity (sem camada de mapeamento)

**Decisão:** As entidades de domínio são diretamente as entidades MikroORM, sem objetos de domínio puros separados.

**Por quê:** Para o escopo deste projeto, uma camada de mapeamento adicionaria boilerplate sem benefício claro. O trade-off é aceito e documentado: o domínio fica acoplado ao ORM.

**Trade-off:** Se o ORM precisar ser trocado, o domínio é afetado. Aceitável dado o tamanho do projeto.

---

### 4. Precisão monetária com BIGINT cents

**Decisão:** Todos os valores monetários são armazenados e trafegados como inteiros em centavos (`BIGINT`). Nunca floats.

**Por quê:** Aritmética de ponto flutuante é imprecisa para dinheiro (`0.1 + 0.2 ≠ 0.3`). Centavos inteiros eliminam esse problema por completo.

**Como:** `R$ 10,50` → `1050`. Multiplicadores são `NUMERIC(10,2)` no banco. A conversão para exibição (`amountCents / 100`) acontece exclusivamente no frontend.

---

### 5. Multiplicador calculado, nunca armazenado

**Decisão:** O multiplicador em tempo real não é persistido. É sempre calculado a partir de `startedAt` via `e^(elapsed × GROWTH_RATE)`.

**Por quê:** Elimina sincronização de estado distribuído. O crash point pré-determinado funciona como "verdade absoluta" — o multiplicador é apenas uma função do tempo. O frontend calcula localmente a cada frame via `requestAnimationFrame`, com correção de drift pelos eventos `round:tick`.

---

### 6. Idempotência por chave na tabela de transações

**Decisão:** O Wallet Service verifica se a `idempotencyKey` já existe em `wallet_transactions` antes de processar qualquer operação. Se existir, apenas faz ACK da mensagem sem reprocessar.

**Por quê:** RabbitMQ garante at-least-once delivery — a mesma mensagem pode ser entregue mais de uma vez. Sem idempotência, um retry causaria double-debit ou double-credit.

**Chaves usadas:** `wallet.debit:{betId}` e `wallet.credit:{betId}`.

---

### 7. Kong como único ponto de autenticação

**Decisão:** Os serviços de backend nunca validam JWT. Confiam nos headers `X-User-Id` e `X-Username` injetados pelo Kong após validação do token Keycloak.

**Por quê:** Centraliza a lógica de autenticação, evita duplicação de código e dependências de validação JWT em cada serviço.

**Trade-off:** Os serviços precisam confiar na rede interna (Kong → serviços). Em produção, isso seria reforçado com mTLS ou rede privada.

---

### 8. Spec-Driven Development

Todo o desenvolvimento seguiu specs escritas antes do código, disponíveis em `docs/specs/`. Cada spec define user stories, contrato técnico, edge cases e critérios de aceitação. Foram escritas 33 specs ao longo do projeto.

---

## Fluxo completo de uma aposta

```
1. Jogador envia POST /games/bet
2. game-service valida fase, saldo (via saldo local) e duplicata
3. game-service insere Bet (PENDING) + Outbox (wallet.debit) na mesma transação
4. Outbox poller publica wallet.debit no RabbitMQ
5. wallet-service consome, verifica idempotência, debita saldo
6. wallet-service publica wallet.debit.success
7. game-service consome, confirma Bet (CONFIRMED), emite round:bet via WebSocket
8. Durante rodada ativa:
   a. Cashout → SELECT FOR UPDATE no round → Bet (CASHEDOUT) + Outbox credit → payout
   b. Crash → todas CONFIRMED → LOST; outbox de crédito ignoradas
```

---

## Links Úteis

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Kong Proxy | http://localhost:8000 |
| Kong Admin | http://localhost:8001 |
| Keycloak Admin | http://localhost:8081 |
| RabbitMQ Management | http://localhost:15672 |
| Swagger (game-service) | http://localhost:4001/api |
| Swagger (wallet-service) | http://localhost:4002/api |
