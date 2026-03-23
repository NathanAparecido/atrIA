# CorpAI — Configuração de Rotas do Nginx Proxy Manager

> Este arquivo documenta as rotas que devem ser configuradas via GUI
> do Nginx Proxy Manager (porta 81).

## Acesso ao Painel NPM

- **URL:** `http://seu-servidor:81`
- **Credenciais padrão (trocar no primeiro acesso):**
  - Email: `admin@example.com`
  - Senha: `changeme`

## Proxy Hosts a Configurar

### 1. CorpAI Frontend (Interface Principal)
| Campo | Valor |
|-------|-------|
| Domain Names | `corpai.empresa.com` |
| Scheme | `http` |
| Forward Hostname | `corpai-frontend` |
| Forward Port | `3001` |
| SSL | Sim (Let's Encrypt ou certificado próprio) |
| Force SSL | Sim |
| HTTP/2 | Sim |

**Custom Location** (para API):
| Campo | Valor |
|-------|-------|
| Location | `/api` |
| Scheme | `http` |
| Forward Hostname | `corpai-backend` |
| Forward Port | `8080` |

> **Nota:** A Custom Location do /api já está embutida no Dockerfile do frontend. Se usar o NPM como proxy, a configuração do Nginx interno do container será ignorada para rotas externas.

### 2. Grafana (Dashboards)
| Campo | Valor |
|-------|-------|
| Domain Names | `grafana.empresa.com` |
| Forward Hostname | `grafana` |
| Forward Port | `3000` |

### 3. Zabbix (Monitoramento)
| Campo | Valor |
|-------|-------|
| Domain Names | `zabbix.empresa.com` |
| Forward Hostname | `zabbix-web` |
| Forward Port | `8080` |

### 4. Paperless-NGX (GED)
| Campo | Valor |
|-------|-------|
| Domain Names | `paperless.empresa.com` |
| Forward Hostname | `paperless-ngx` |
| Forward Port | `8000` |

### 5. Dify (Orquestração RAG — Acesso Restrito)
| Campo | Valor |
|-------|-------|
| Domain Names | `dify.empresa.com` |
| Forward Hostname | `dify-web` |
| Forward Port | `3000` |
| Access List | Apenas admins (configurar no NPM) |

## Certificados SSL

Para ambiente air-gapped (sem acesso à internet):
1. Gere certificados autoassinados ou use CA interna
2. No NPM: SSL → Custom → faça upload dos arquivos `.crt` e `.key`

Para ambiente com acesso à internet:
1. No NPM: SSL → Request a new SSL Certificate → Let's Encrypt
2. Marque "Force SSL" e "HTTP/2 Support"
