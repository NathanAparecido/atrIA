# CorpAI — Sistema de IA Interna Corporativa

> Assistente RAG 100% self-hosted, air-gapped, rodando on-premise.
> Nenhum dado sai do servidor. Sem integrações externas.

## Pré-requisitos

| Componente | Versão Mínima |
|------------|---------------|
| Docker | 24+ |
| Docker Compose | v2+ |
| RAM | 64 GB (recomendado para Qwen2.5:72b) |
| GPU (opcional) | NVIDIA com drivers CUDA + nvidia-container-toolkit |
| Disco | 100 GB livre (modelos + dados) |
| SO | Ubuntu 22.04+ / Debian 12+ / RHEL 9+ |

## Instalação Rápida

```bash
# 1. Clonar o repositório
git clone <repo> && cd corpai

# 2. Executar o setup
chmod +x setup.sh
./setup.sh

# 3. Editar senhas no .env (OBRIGATÓRIO)
nano .env
# Substitua TODOS os valores "TROQUE_ESTA_*"

# 4. Reiniciar com as novas senhas
docker compose down && docker compose up -d

# 5. Fazer pull dos modelos no Ollama (quando pronto)
docker exec corpai-ollama ollama pull nomic-embed-text
docker exec corpai-ollama ollama pull qwen2.5:72b
```

## Serviços e Portas

| Serviço | Porta Interna | Porta Exposta | Descrição |
|---------|---------------|---------------|-----------|
| corpai-frontend | 3001 | via NPM | Interface do usuário |
| corpai-backend | 8080 | via NPM | API FastAPI |
| Ollama | 11434 | 127.0.0.1:11434 | LLM Runtime (somente localhost) |
| ChromaDB | 8000 | — | Banco vetorial |
| PostgreSQL | 5432 | — | Banco relacional |
| Redis | 6379 | — | Cache/sessões |
| Dify Web | 3000 | via NPM | Interface Dify |
| Dify API | 5001 | — | API Dify |
| Nginx Proxy Manager | 80, 443, 81 | 80, 443, 81 | Proxy reverso |
| Grafana | 3000 | via NPM | Dashboards |
| Zabbix Web | 8080 | via NPM | Monitoramento |
| Paperless-NGX | 8000 | via NPM | GED |

## Configuração do Nginx Proxy Manager

Após a instalação, acesse `http://seu-servidor:81` com as credenciais padrão:
- **Email:** admin@example.com
- **Senha:** changeme

Crie os seguintes Proxy Hosts:

| Domínio | Forward Host | Forward Port | SSL |
|---------|-------------|--------------|-----|
| corpai.empresa.com | corpai-frontend | 3001 | Sim |
| corpai.empresa.com/api/* | corpai-backend | 8080 | Sim |
| grafana.empresa.com | grafana | 3000 | Sim |
| zabbix.empresa.com | zabbix-web | 8080 | Sim |
| paperless.empresa.com | paperless-ngx | 8000 | Sim |
| dify.empresa.com | dify-web | 3000 | Sim |

> **Nota:** Para `corpai.empresa.com/api/*`, configure como *Custom Location* no host `corpai.empresa.com`.

## Primeiro Acesso

1. **CorpAI**: Acesse `corpai.empresa.com` — login com admin/senha definida no `.env`
2. **Grafana**: Acesse `grafana.empresa.com` — login com credenciais do `.env`
3. **Zabbix**: Acesse `zabbix.empresa.com` — login padrão Admin/zabbix
4. **Paperless**: Acesse `paperless.empresa.com` — login com credenciais do `.env`
5. **Dify**: Acesse `dify.empresa.com` — configurar na primeira vez

## Setores e Namespaces

Cada setor tem um namespace isolado no ChromaDB:

| Namespace | Setor |
|-----------|-------|
| `noc` | NOC |
| `suporte_n2` | Suporte N2 |
| `suporte_n3` | Suporte N3 |
| `financeiro` | Financeiro |
| `diretoria` | Diretoria |
| `vendas` | Vendas |
| `marketing` | Marketing |
| `vendas_dc` | Vendas DC |
| `infra` | Infraestrutura |
| `suporte_rua` | Suporte Rua |
| `global` | Base Global (incluída em todas as consultas) |

## Roles de Acesso

| Role | Permissões |
|------|-----------|
| `colaborador` | Chat (base do setor + global) |
| `gerente` | Chat + upload de documentos no próprio setor |
| `admin` | Acesso total a todos os setores, usuários e configurações |

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx Proxy Manager                   │
│               (80, 443 — SSL termination)                │
└─────────┬───────────┬──────────┬──────────┬─────────────┘
          │           │          │          │
    ┌─────▼─────┐ ┌──▼───┐ ┌───▼──┐ ┌────▼─────┐
    │ Frontend  │ │ Dify │ │Grafana│ │ Paperless │
    │  (React)  │ │ Web  │ │      │ │   NGX    │
    └─────┬─────┘ └──────┘ └──────┘ └──────────┘
          │
    ┌─────▼─────┐
    │  Backend  │──────────────────────┐
    │ (FastAPI) │                      │
    └──┬──┬──┬──┘                      │
       │  │  │                         │
  ┌────▼┐ │ ┌▼────────┐         ┌─────▼─────┐
  │Redis│ │ │ChromaDB │         │  Ollama   │
  └─────┘ │ │(vetores)│         │(LLM local)│
          │ └─────────┘         └───────────┘
    ┌─────▼──────┐
    │ PostgreSQL │
    │   (dados)  │
    └────────────┘
```

## Segurança

- ✅ Ollama nunca exposto externamente (bind 127.0.0.1)
- ✅ Todas as senhas via variáveis de ambiente
- ✅ JWT com expiração configurável
- ✅ Namespace isolado por setor (extraído do JWT, nunca do request)
- ✅ ChromaDB com autenticação por token
- ✅ Rede Docker isolada (corpai-net)
- ✅ Sem dependências externas em runtime (air-gapped)

## Licença

Uso interno corporativo.
