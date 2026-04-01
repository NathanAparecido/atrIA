# Resumo de Setup do Projeto: atrIA / CorpAI

Este documento resume as atividades, arquitetura e integrações realizadas até o momento no projeto **atrIA** (também referido como **CorpAI**). O objetivo deste arquivo é fornecer contexto estruturado para que outra IA possa analisar o estado atual do sistema e auxiliar nas próximas tarefas.

---

## 1. Visão Geral do Sistema

O sistema é uma plataforma de chat corporativo assistido por IA que utiliza o **Dify** como motor de serviços de LLM, um frontend premium de chat customizado e backends de orquestração (Node.js API, n8n, Supabase).

## 2. Decisões de Arquitetura e Infraestrutura

A infraestrutura foi segmentada para otimizar os recursos do servidor:

*   **Dify (Motor de IA)**: Configurado para rodar no cluster Kubernetes (K8s) sob o domínio `cronnos.netwise.com.br`.
*   **Backend Atria (n8n, API Node.js, BD)**: Implantação configurada via **Docker Compose** no servidor apontando para o domínio `database.netwise.com.br`.
*   **Roteamento e SSL**: Utilização do **Nginx Proxy Manager (NPM)** para emitir certificados SSL e fazer o proxy reverso seguro. Problemas de mapeamento de porta e erro "502 Bad Gateway" foram resolvidos ajustando as configurações de rede do Nginx para com o Docker.

## 3. O que já foi feito (Changelog / Histórico)

Abaixo estão as principais frentes de trabalho resolvidas e estabilizadas:

### 3.1. Frontend (Chat UI)
*   **Restauração da Interface Premium**: Retorno à interface original de Chat estilo ChatGPT, incluindo as animações de partículas na tela de login.
*   **Mudança no provedor de API**: O Frontend foi redirecionado para consumir a **API Node.js Local (modo self-hosted)**, desfazendo o acoplamento anterior que obrigava o uso externo do Supabase.

### 3.2. Integração e Isolamento do Dify
*   **White-label**: Integração do backend do Dify no motor do Atria, eliminando por completo o código residual, cores ou marcas do Dify na interface de usuário nativa.
*   **Deploy Isolado**: O compose original foi unificado e desmembrado conforme a necessidade, incluindo serviços do Dify e do Atria lado a lado quando necessário, mantendo as configurações isoladas.

### 3.3. Correções no Backend (CorpAI)
*   **SQLAlchemy**: Resolvidos problemas críticos na inicialização da aplicação decorrentes de mapeamento incorreto de relacionamentos (`relationships`) nos modelos de banco de dados do SQLAlchemy.
*   **Modo CPU-Only**: O docker-compose e referências dos serviços do backend foram adaptados para inicializar forçosamente no modo usando **apenas processador (CPU-only)**, para contornar travamentos ligados à falta/falha de drivers de GPU nas instâncias.
*   **Docker Health Checks**: Escritas de testes lógicos nas rotinas de boot dos contêineres garantindo a ordem certa de subida dos serviços dependentes para evitar queda da aplicação logo após a inicialização.

### 3.4. Monitoramento e Observabilidade
*   Foram iniciadas configurações de arquivos para importação de **Templates Zabbix** dedicados ao monitoramento (`corpai_monitoring.xml`).

---

## 4. Estrutura Recomendada para a IA Leitora

Caso a IA leitora precise sugerir mudanças, pedimos que considere que:
1. O setup e o fluxo principal foram isolados de dependência estrita de cloud externa (API operando em *self-host* locamente).
2. O servidor carece das camadas de aceleração de GPU corretas até o momento. Não escreva comandos ou scripts assumindo disponibilidade do provedor de placa de vídeo sem consulta prévia.
3. O Nginx atua ativamente para direcionar portas entre instâncias Docker diferentes.
