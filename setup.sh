#!/bin/bash
# ============================================================
# CorpAI — Script de Instalação
# Uso: chmod +x setup.sh && ./setup.sh
# ============================================================

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║          CorpAI — Instalação Automatizada           ║"
echo "║    Sistema de IA Interna Corporativa (Air-Gapped)   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── 1. Criar .env a partir do .env.example ────────────────
if [ ! -f .env ]; then
    echo "[1/3] Criando arquivo .env a partir do .env.example..."
    cp .env.example .env
    echo "      ⚠️  ATENÇÃO: Edite o arquivo .env e substitua TODAS as senhas padrão!"
    echo "      Arquivo .env criado com sucesso."
else
    echo "[1/3] Arquivo .env já existe. Pulando criação."
fi

echo ""

# ─── 2. Subir os containers ────────────────────────────────
echo "[2/3] Iniciando todos os containers Docker..."
docker compose up -d --build

echo ""

# ─── 3. Verificar status dos serviços ──────────────────────
echo "[3/3] Verificando status dos containers..."
echo ""
docker compose ps

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              Instalação Concluída!                  ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  Serviços disponíveis:                               ║"
echo "║  • NPM Admin:  http://localhost:81                   ║"
echo "║  • Frontend:    http://localhost:3001 (via NPM)      ║"
echo "║  • Backend API: http://localhost:8080 (via NPM)      ║"
echo "║  • Grafana:     http://localhost:3000 (via NPM)      ║"
echo "║                                                      ║"
echo "║  ⚠️  Próximos passos:                                ║"
echo "║  1. Edite o .env e troque TODAS as senhas padrão     ║"
echo "║  2. Reinicie: docker compose down && docker compose  ║"
echo "║     up -d                                            ║"
echo "║  3. Configure o Nginx Proxy Manager (porta 81)       ║"
echo "║  4. Faça pull dos modelos no Ollama:                 ║"
echo "║     docker exec corpai-ollama ollama pull            ║"
echo "║       nomic-embed-text                               ║"
echo "║     docker exec corpai-ollama ollama pull            ║"
echo "║       qwen2.5:72b                                    ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
