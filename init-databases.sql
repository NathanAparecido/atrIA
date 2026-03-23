-- ============================================================
-- Script de inicialização do PostgreSQL
-- Cria bancos separados para cada serviço
-- ============================================================

-- Banco para o Dify
SELECT 'CREATE DATABASE dify'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dify')\gexec

-- Banco para o Paperless-NGX
SELECT 'CREATE DATABASE paperless'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'paperless')\gexec

-- Banco para o Zabbix
SELECT 'CREATE DATABASE zabbix'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'zabbix')\gexec
