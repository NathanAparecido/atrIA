# atrIA 🤖

**IA Corporativa Self-Hosted: Inteligência Centralizada e Segura**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Dify](https://img.shields.io/badge/Dify-Self--Hosted-blue?logo=dify&logoColor=white)](https://dify.ai/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

---

## 📋 Sobre

atrIA é uma plataforma de IA corporativa disruptiva, focada em segurança B2B. Diferente de modelos SaaS, o atrIA roda inteiramente em sua infraestrutura (Self-Hosted), utilizando o **Dify** como motor de inteligência e uma API customizada para orquestração.

## 🚀 Tecnologias (Stack Self-Hosted)

| Componente | Tecnologia | Papel |
|------------|------------|-------|
| **Frontend** | React 18 + Vite | Interface Bento Grid & Glassmorphism |
| **API Backend**| Node.js + Express | Orquestração, Auth JWT e Auditoria |
| **Engine IA** | Dify (Docker) | Workflow de Chat e Base de Conhecimento |
| **Database** | PostgreSQL | Persistência Local de Mensagens e Usuários |
| **Proxy** | Nginx | Roteamento Unificado e Segurança (CSP) |

## 🛠️ Guia de Implementação

Para instalar o atrIA do zero em uma nova máquina, siga o nosso guia detalhado:

👉 **[Guia de Implementação Self-Hosted](.gemini/antigravity/brain/3240aae3-dd5c-42b7-a5b3-d58aa1754772/guia_implementacao_self_hosted.md)**

## 📁 Estrutura do Projeto

```
atria/
├── api/           # Backend Node.js (API de Orquestração)
├── src/           # Frontend React (Telas e Componentes)
├── nginx/         # Configurações do Proxy Reverso
├── docker-compose.full.yml # Orquestração completa do stack
└── ...
```

## ⚡ Quick Start (Modo Docker)

```bash
# 1. Configurar ambiente
cp .env.example .env
# Configurar DIFY_API_KEY e ATRIA_JWT_SECRET no .env

# 2. Subir o stack completo
docker compose -f docker-compose.full.yml up -d
```

---

**Desenvolvido para atrIA** | Inteligência Privada e Disruptiva.
