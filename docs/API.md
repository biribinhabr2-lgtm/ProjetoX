# FestaHub API v1 — Documentação

API REST para integração de sistemas externos (ex.: software desktop, ERP) com o FestaHub.

**Base URL**
```
https://mjnjxhtkfmwhzatgpbox.supabase.co/functions/v1/api-v1
```

---

## Autenticação

Todas as rotas exigem o header:

```
Authorization: Bearer fh_live_<sua_chave>
```

As chaves são geradas em **Configurações → API** no painel do FestaHub.
Disponível nos planos **Profissional** e **Rede**.

- Cada chave pertence a uma organização; só acessa dados dessa org.
- A chave é exibida **uma única vez** na geração — guarde em local seguro.
- Chaves revogadas retornam `401` imediatamente.
- **Rate limit**: 60 requisições por minuto por chave. Excedido → `429`.

---

## Formato das respostas

Todas as respostas são JSON.

**Sucesso:**
```json
{ "data": <objeto ou array> }
```

**Sucesso com paginação:**
```json
{ "data": [...], "meta": { "limit": 50, "offset": 0, "count": 12 } }
```

**Criação (201):**
```json
{ "data": <objeto criado> }
```

**Erro:**
```json
{ "error": "Mensagem descritiva" }
```

---

## Rotas

### `GET /events`

Lista festas da organização.

**Parâmetros de query:**

| Parâmetro | Tipo   | Descrição                                      |
|-----------|--------|------------------------------------------------|
| `from`    | string | Data inicial (YYYY-MM-DD), inclusivo           |
| `to`      | string | Data final (YYYY-MM-DD), inclusivo             |
| `status`  | string | `orcamento` \| `confirmada` \| `realizada` \| `cancelada` |
| `limit`   | int    | Máx resultados (padrão: 50, máx: 100)          |
| `offset`  | int    | Paginação (padrão: 0)                          |

**Exemplo:**
```bash
curl -H "Authorization: Bearer fh_live_<chave>" \
  "https://mjnjxhtkfmwhzatgpbox.supabase.co/functions/v1/api-v1/events?from=2026-06-01&to=2026-06-30&status=confirmada"
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Festa da Maria",
      "date": "2026-06-15",
      "start_time": "14:00",
      "end_time": "18:00",
      "status": "confirmada",
      "guests_count": 50,
      "total_cents": 150000,
      "deposit_cents": 50000,
      "deposit_paid": true,
      "notes": null,
      "created_at": "2026-06-01T10:00:00Z",
      "customer": {
        "id": "uuid",
        "name": "João Silva",
        "phone": "22999990000"
      }
    }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 1 }
}
```

---

### `GET /events/:id`

Retorna uma festa pelo ID.

**Exemplo:**
```bash
curl -H "Authorization: Bearer fh_live_<chave>" \
  https://mjnjxhtkfmwhzatgpbox.supabase.co/functions/v1/api-v1/events/uuid-da-festa
```

**Resposta:** mesmo formato de um item em `GET /events`.

Retorna `404` se o ID não pertence à sua organização.

---

### `POST /events`

Cria uma nova festa.

**Body JSON:**

| Campo         | Tipo    | Obrig. | Descrição                                       |
|---------------|---------|--------|-------------------------------------------------|
| `date`        | string  | ✓      | Data da festa (YYYY-MM-DD)                      |
| `customer_id` | string  | *      | UUID do cliente (omita para criar anônimo)      |
| `title`       | string  | *      | Título (obrigatório se `customer_id` omitido)   |
| `start_time`  | string  |        | Hora início (HH:MM)                             |
| `end_time`    | string  |        | Hora fim (HH:MM)                                |
| `status`      | string  |        | Padrão: `orcamento`                             |
| `guests_count`| int     |        | Número de convidados                            |
| `total_cents` | int     |        | Valor total em centavos                         |
| `deposit_cents`| int    |        | Valor do sinal em centavos                      |
| `deposit_paid`| boolean |        | Sinal pago? (padrão: false)                     |
| `notes`       | string  |        | Observações                                     |

*`customer_id` ou `title` obrigatório.

**Exemplo:**
```bash
curl -X POST \
  -H "Authorization: Bearer fh_live_<chave>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "uuid-do-cliente",
    "date": "2026-07-15",
    "title": "Festa da Maria",
    "start_time": "14:00",
    "end_time": "18:00",
    "total_cents": 180000,
    "status": "confirmada"
  }' \
  https://mjnjxhtkfmwhzatgpbox.supabase.co/functions/v1/api-v1/events
```

**Resposta:** `201` com o objeto criado.

---

### `PATCH /events/:id`

Atualiza campos de uma festa existente.

**Campos atualizáveis:**
`date`, `start_time`, `end_time`, `status`, `guests_count`, `total_cents`,
`deposit_cents`, `deposit_paid`, `notes`, `title`

**Exemplo:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer fh_live_<chave>" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmada", "total_cents": 200000}' \
  https://mjnjxhtkfmwhzatgpbox.supabase.co/functions/v1/api-v1/events/uuid-da-festa
```

Retorna `404` se o ID não pertence à sua organização.

---

### `GET /customers`

Lista clientes da organização.

**Parâmetros de query:**

| Parâmetro | Tipo   | Descrição                                 |
|-----------|--------|-------------------------------------------|
| `search`  | string | Busca por nome, telefone ou e-mail (ilike)|
| `limit`   | int    | Máx resultados (padrão: 50, máx: 100)    |
| `offset`  | int    | Paginação (padrão: 0)                     |

**Exemplo:**
```bash
curl -H "Authorization: Bearer fh_live_<chave>" \
  "https://mjnjxhtkfmwhzatgpbox.supabase.co/functions/v1/api-v1/customers?search=Maria"
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Maria Souza",
      "phone": "22999998888",
      "email": "maria@email.com",
      "child_name": "Bia",
      "child_birthdate": "2020-03-10",
      "created_at": "2026-05-01T09:00:00Z"
    }
  ],
  "meta": { "limit": 50, "offset": 0, "count": 1 }
}
```

---

## Códigos de status

| Código | Significado                                  |
|--------|----------------------------------------------|
| 200    | Sucesso                                      |
| 201    | Recurso criado                               |
| 400    | Body inválido                                |
| 401    | Chave inválida, revogada ou ausente          |
| 403    | Plano não permite este recurso               |
| 404    | Recurso não encontrado (ou não é sua org)    |
| 405    | Método HTTP não suportado                    |
| 422    | Dados válidos mas regra de negócio violada   |
| 429    | Rate limit excedido (60 req/min)             |
| 500    | Erro interno                                 |

---

## Segurança

- Toda requisição autentica via SHA-256 da chave — nunca trafegamos o hash armazenado.
- Cada rota filtra explicitamente por `org_id` resolvido da chave — impossível acessar dados de outra organização mesmo com um UUID válido de outro tenant.
- A chave nunca é armazenada em texto puro no banco; apenas o hash SHA-256.
- Use HTTPS sempre. HTTP não é suportado (Supabase Edge Functions são HTTPS-only).
