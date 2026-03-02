# 🐳 Docker Setup - Guia Completo

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado no servidor:

```bash
# Verificar se Docker está instalado
docker --version

# Verificar se Docker Compose está instalado
docker compose version
```

Se não estiver instalado, instale com:

```bash
# Instalar Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker (opcional)
sudo usermod -aG docker $USER
```

## 🚀 Instalação do Projeto

### Passo 1: Upload do arquivo

```bash
# Do seu computador local, envie o tar.gz para o servidor
scp atria-chatbot.tar.gz root@SEU_IP:/opt/
```

### Passo 2: Extrair arquivos

```bash
# No servidor
mkdir -p /opt/atria
tar -xzf /opt/atria-chatbot.tar.gz -C /opt/atria

# Verificar se todos os arquivos foram extraídos
ls -la /opt/atria/
```

**Deve mostrar:**
- ✅ Dockerfile
- ✅ docker-compose.yml
- ✅ nginx.conf
- ✅ package.json
- ✅ src/
- ✅ .env.example

**Se faltar algum arquivo, há problema na extração!**

### Passo 3: Configurar .env

```bash
cd /opt/atria
cp .env.example .env
nano .env
```

Preencha:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
VITE_N8N_WEBHOOK_URL=https://sua-instancia-n8n.com/webhook/endpoint
```

### Passo 4: Build e Start

```bash
cd /opt/atria

# Build da imagem (primeira vez pode demorar 2-3 minutos)
docker compose build --no-cache

# Iniciar container
docker compose up -d

# Ver logs em tempo real
docker compose logs -f
```

## 🔍 Verificar se está funcionando

```bash
# Ver status do container
docker compose ps

# Deve mostrar:
# NAME            STATUS
# atria-chatbot   Up (healthy)

# Testar no navegador
curl http://localhost:8080

# Ou abrir no navegador
http://SEU_IP:8080
```

## 🐛 Troubleshooting

### ❌ Erro: "failed to read dockerfile: open Dockerfile: no such file or directory"

**Causa:** Arquivo tar.gz não foi extraído corretamente.

**Solução:**
```bash
# Limpar diretório
rm -rf /opt/atria/*

# Extrair novamente (use -C!)
tar -xzf /opt/atria-chatbot.tar.gz -C /opt/atria

# Verificar
ls -la /opt/atria/
```

### ❌ Erro: "denied: access forbidden"

**Causa:** Tentando usar imagem do registry em vez de fazer build local.

**Solução:**
```bash
# Editar docker-compose.yml e garantir que tem:
build:
  context: .
  dockerfile: Dockerfile

# NÃO deve ter:
# image: ghcr.io/codecrafters-io/atria:latest
```

### ❌ Erro: "port is already allocated"

**Causa:** Porta 8080 já está em uso.

**Solução:**
```bash
# Ver o que está usando a porta
sudo lsof -i :8080

# Mudar a porta no docker-compose.yml
nano docker-compose.yml

# Trocar de:
ports:
  - "8080:80"

# Para:
ports:
  - "8081:80"  # Ou outra porta livre
```

### ❌ Container inicia mas não responde

**Verificar logs:**
```bash
docker compose logs atria-chatbot

# Ver logs em tempo real
docker compose logs -f atria-chatbot
```

**Verificar se o build funcionou:**
```bash
# Entrar no container
docker exec -it atria-chatbot sh

# Verificar se os arquivos estão lá
ls -la /usr/share/nginx/html/

# Deve ter: index.html, assets/, etc.
```

### ❌ Erro de variáveis de ambiente

**Causa:** .env não foi configurado ou não tem as variáveis corretas.

**Solução:**
```bash
cd /opt/atria
cat .env

# Verificar se tem TODAS as variáveis:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_N8N_WEBHOOK_URL
```

**IMPORTANTE:** Após mudar o .env, precisa fazer rebuild:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 🔄 Comandos úteis

```bash
# Ver status
docker compose ps

# Ver logs
docker compose logs -f

# Parar
docker compose down

# Reiniciar
docker compose restart

# Rebuild completo (após mudanças)
docker compose down
docker compose build --no-cache
docker compose up -d

# Limpar tudo e recomeçar
docker compose down
docker system prune -a
docker compose build --no-cache
docker compose up -d

# Ver uso de recursos
docker stats atria-chatbot

# Entrar no container
docker exec -it atria-chatbot sh
```

## 📊 Monitoramento

```bash
# Health check
docker inspect atria-chatbot | grep -A 10 Health

# Verificar uptime
docker ps | grep atria-chatbot

# Ver logs dos últimos 100 linhas
docker compose logs --tail=100 atria-chatbot
```

## 🔐 Segurança

### Firewall

```bash
# Permitir apenas porta 8080
sudo ufw allow 8080/tcp

# Bloquear acesso direto ao Docker
sudo ufw deny 2375/tcp
sudo ufw deny 2376/tcp
```

### HTTPS (Recomendado)

Para produção, use um reverse proxy como Nginx ou Caddy:

```bash
# Exemplo com Caddy (mais simples)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Configurar Caddy
sudo nano /etc/caddy/Caddyfile
```

Conteúdo do Caddyfile:
```
seu-dominio.com {
    reverse_proxy localhost:8080
}
```

```bash
sudo systemctl restart caddy
```

## 📦 Atualização

Para atualizar para nova versão:

```bash
# Baixar novo tar.gz
cd /opt
scp atria-chatbot.tar.gz root@SEU_IP:/opt/atria-chatbot-new.tar.gz

# Backup do .env
cp /opt/atria/.env /opt/.env.backup

# Parar container
cd /opt/atria
docker compose down

# Limpar e extrair novo
rm -rf /opt/atria/*
tar -xzf /opt/atria-chatbot-new.tar.gz -C /opt/atria

# Restaurar .env
cp /opt/.env.backup /opt/atria/.env

# Rebuild e start
docker compose build --no-cache
docker compose up -d
```

## 🎯 Checklist Completo

- [ ] Docker e Docker Compose instalados
- [ ] Arquivo tar.gz extraído em /opt/atria
- [ ] Arquivo Dockerfile existe em /opt/atria
- [ ] Arquivo docker-compose.yml existe em /opt/atria
- [ ] Arquivo .env configurado com credenciais corretas
- [ ] Build executado com sucesso
- [ ] Container iniciado e com status "healthy"
- [ ] Aplicação acessível no navegador
- [ ] Login funcionando
- [ ] Senha do admin alterada

## 📞 Suporte

Se ainda tiver problemas, forneça:
- Output de `docker compose ps`
- Output de `docker compose logs atria-chatbot`
- Output de `ls -la /opt/atria/`
- Conteúdo do docker-compose.yml (sem senhas)
