#!/usr/bin/env node
/**
 * build-bundle.mjs — gera atria-project-bundle.md com todo o código relevante
 * do atrIA num único arquivo, pronto para upload em "Projects" no Claude web.
 *
 * Uso: node build-bundle.mjs
 *
 * Exclui por padrão:
 *  - antigravity-awesome-skills-main/  (clone third-party)
 *  - agents/                           (definições genéricas de agente)
 *  - package-lock.json                 (ruído)
 *  - binários (imagens, fontes)
 *  - dashboards/templates pesados (grafana json, zabbix xml)
 *  - arquivos > 200KB
 *
 * Para ajustar: edite EXCLUDE_PATTERNS / MAX_FILE_SIZE abaixo.
 */

import { readFileSync, writeFileSync, statSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Sempre rodar a partir da raiz do repo (onde este script vive), para que
// `git ls-files` e o caminho de saída funcionem mesmo quando chamado de outro
// cwd — ex.: por um hook Stop do harness.
process.chdir(import.meta.dirname);

const EXCLUDE_PATTERNS = [
  /^antigravity-awesome-skills-main\//,
  /^agents\//,
  /(^|\/)package-lock\.json$/,
  /\.(png|jpg|jpeg|gif|ico|webp|svg|bmp|tiff)$/i,
  /\.(woff2?|ttf|eot|otf)$/i,
  /\.(mp3|mp4|webm|mov|wav|ogg)$/i,
  /\.(pdf|zip|tar|gz|7z|rar)$/i,
  /^grafana\/.*\.json$/,
  /^zabbix\/templates\/.*\.xml$/,
  /^atria-project-bundle\.md$/,   // o próprio bundle — evita recursão
  /^\.claude\//,                  // config local do harness, não é código do projeto
  /^\.playwright-mcp\//,          // artefatos de screenshot/snapshot dos testes
];

const MAX_FILE_SIZE = 200 * 1024;

const EXT_TO_LANG = {
  '.js': 'javascript', '.jsx': 'jsx', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'tsx',
  '.py': 'python',
  '.md': 'markdown', '.mdx': 'markdown',
  '.html': 'html', '.htm': 'html',
  '.css': 'css', '.scss': 'scss',
  '.json': 'json', '.jsonc': 'json',
  '.yml': 'yaml', '.yaml': 'yaml',
  '.sh': 'bash', '.bash': 'bash',
  '.sql': 'sql',
  '.toml': 'toml', '.ini': 'ini',
  '.xml': 'xml',
  '.env': 'dotenv',
};

const SPECIAL_FILENAMES = {
  'dockerfile': 'dockerfile',
  '.env.example': 'dotenv',
  '.gitignore': 'gitignore',
};

function langFor(file) {
  const base = path.basename(file).toLowerCase();
  if (SPECIAL_FILENAMES[base]) return SPECIAL_FILENAMES[base];
  return EXT_TO_LANG[path.extname(file).toLowerCase()] ?? '';
}

// Rastreados + não rastreados (mas não git-ignorados) — assim arquivos novos
// como components/landing/ entram no bundle sem precisar de `git add` antes.
const tracked = execSync('git ls-files', { encoding: 'utf8' }).split(/\r?\n/);
const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' }).split(/\r?\n/);
const allFiles = [...new Set([...tracked, ...untracked].filter(Boolean))].sort();

const included = allFiles.filter(
  (f) => !EXCLUDE_PATTERNS.some((re) => re.test(f)),
);

const OUT = 'atria-project-bundle.md';
const now = new Date().toISOString();

let bundle = `# atrIA — Project Bundle

> Gerado em ${now}
> ${included.length} arquivos. Use este bundle como contexto no Claude Projects.

## Estrutura

\`\`\`
${included.join('\n')}
\`\`\`

---

`;

const omitted = [];
const errors = [];

for (const file of included) {
  let stat;
  try {
    stat = statSync(file);
  } catch (e) {
    errors.push({ file, error: e.message });
    continue;
  }
  if (!stat.isFile()) continue;

  if (stat.size > MAX_FILE_SIZE) {
    omitted.push({ file, size: stat.size });
    bundle += `\n## \`${file}\`\n\n_(arquivo > ${MAX_FILE_SIZE} bytes omitido — ${stat.size} bytes)_\n\n---\n`;
    continue;
  }

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch (e) {
    errors.push({ file, error: e.message });
    continue;
  }

  const lang = langFor(file);
  const fence = content.includes('```') ? '~~~' : '```';
  const trail = content.endsWith('\n') ? '' : '\n';

  bundle += `\n## \`${file}\`\n\n${fence}${lang}\n${content}${trail}${fence}\n\n---\n`;
}

writeFileSync(OUT, bundle, 'utf8');

const sizeKB = (bundle.length / 1024).toFixed(1);
console.log(`\nWrote ${OUT}`);
console.log(`  size:     ${sizeKB} KB`);
console.log(`  files:    ${included.length} included, ${omitted.length} omitted (size), ${errors.length} errors`);

if (omitted.length) {
  console.log('\nOmitted by size:');
  for (const o of omitted) {
    console.log(`  - ${o.file} (${(o.size / 1024).toFixed(1)} KB)`);
  }
}
if (errors.length) {
  console.log('\nErrors:');
  for (const e of errors) console.log(`  - ${e.file}: ${e.error}`);
}
