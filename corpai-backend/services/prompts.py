"""
CorpAI — Resolução do prompt de sistema.

O prompt de sistema é editável via UID (tabela `prompt_configs`). A resolução
segue a precedência: override do setor → prompt padrão armazenado → built-in
abaixo. Mantido sem dependência de chroma/ollama de propósito (só SQLAlchemy),
para poder ser usado em qualquer caminho sem custo de import.
"""

from datetime import date, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.prompt_config import PromptConfig

# Tipos válidos de documento (mesma lista do guia de redação).
TIPOS_DOC = ["procedimento", "escalacao", "faq", "politica", "referencia"]

# Escopo especial: o prompt padrão global (usado quando não há override de setor).
DEFAULT_SETOR = "__default__"

# Prompt built-in — usado quando não há nada armazenado no banco. É também o
# texto oferecido na UI como "restaurar padrão".
DEFAULT_SYSTEM_PROMPT = """Você é a liminai, assistente de inteligência artificial interna da empresa.
Sua função é responder perguntas dos colaboradores com base na documentação interna da empresa.

REGRAS IMPORTANTES:
1. Responda SEMPRE em português brasileiro (PT-BR).
2. Use APENAS as informações do contexto fornecido para responder.
3. Se a informação não estiver no contexto, diga claramente: "Não encontrei essa informação na base de conhecimento."
4. Nunca invente informações que não estejam no contexto.
5. Seja objetivo, claro e profissional nas respostas.
6. Cite a fonte do documento apenas se o usuário solicitar explicitamente (ex: "de onde veio isso?", "qual a fonte?"). No formato: *Fonte: [Título do Documento]*.
7. Use formatação Markdown para estruturar suas respostas quando apropriado.
8. Se a pergunta for ambígua, peça esclarecimento ao usuário.
9. Se um documento usado na resposta estiver marcado como "[ATENÇÃO: revisão vencida]" ou "[ATENÇÃO: revisão próxima do vencimento]", avise o usuário ao final da resposta, informando a data da última revisão (revisado_em). Ex: "⚠️ Esta informação foi revisada pela última vez em DD/MM/AAAA e pode estar desatualizada."
10. Se o documento usado for do tipo "procedimento", responda em passos numerados, executáveis e na ordem correta."""


async def _buscar(db: AsyncSession, setor: str) -> Optional[PromptConfig]:
    result = await db.execute(select(PromptConfig).where(PromptConfig.setor == setor))
    return result.scalar_one_or_none()


async def obter_prompt_efetivo(db: AsyncSession, setor: str) -> str:
    """
    Retorna o prompt de sistema efetivo para um setor.

    Precedência: override do setor (se houver e não vazio) → padrão armazenado
    (se houver e não vazio) → built-in `DEFAULT_SYSTEM_PROMPT`.
    """
    if setor and setor != DEFAULT_SETOR:
        override = await _buscar(db, setor)
        if override and override.conteudo.strip():
            return override.conteudo

    padrao = await _buscar(db, DEFAULT_SETOR)
    if padrao and padrao.conteudo.strip():
        return padrao.conteudo

    return DEFAULT_SYSTEM_PROMPT


def construir_prompt_redacao(setor: str, tipo: Optional[str] = None) -> str:
    """
    Monta o prompt de sistema que instrui o LLM a transformar texto livre do
    colaborador em UM documento Markdown no padrão da base (front-matter +
    seções + perguntas-semente). A saída deve ser só o `.md`, sem comentários.
    """
    hoje = date.today()
    valido = hoje + timedelta(days=180)
    hoje_iso = hoje.isoformat()
    valido_iso = valido.isoformat()

    tipo_valido = tipo if tipo in TIPOS_DOC else None
    tipo_campo = tipo_valido or "um de: procedimento | escalacao | faq | politica | referencia"
    if tipo_valido:
        tipo_linha = "O tipo deste documento e: " + tipo_valido + "."
    else:
        tipo_linha = "Escolha o tipo mais adequado entre procedimento, escalacao, faq, politica ou referencia."

    return f"""Voce e a liminai. Sua tarefa e TRANSFORMAR o texto livre enviado pelo colaborador em UM documento Markdown bem estruturado, pronto para ser indexado na base de conhecimento.

Num assistente de busca, a qualidade da resposta depende da ESTRUTURA do documento. Siga o padrao abaixo a risca.

REGRAS DE SAIDA (criticas):
- Responda APENAS com o documento Markdown final. Sem comentarios, sem explicacoes, sem texto antes ou depois, SEM cercas de codigo (```).
- Comece imediatamente com o front-matter, na primeira linha com ---.
- Escreva tudo em portugues brasileiro.

ESTRUTURA OBRIGATORIA:

1) Front-matter YAML entre duas linhas ---, com os campos:
   titulo: especifico e descritivo (nunca generico)
   aliases: lista de 3 a 6 sinonimos/nomes informais que o usuario usaria
   setor: "{setor}"
   sistema: o sistema/produto citado (ou "" se nao houver)
   tipo: {tipo_campo}
   criticidade: baixa | media | alta | critica (escolha pela sensibilidade)
   responsavel: "" (deixe em branco se o texto nao disser quem e o dono)
   revisado_em: {hoje_iso}
   valido_ate: {valido_iso}
   versao: 1
   fonte: a origem citada (ou "")

2) Corpo em secoes Markdown. Cada titulo no formato "## Titulo {{#id}}" com id curto e sem acento. Use as secoes que fizerem sentido:
   ## Visao geral {{#visao-geral}}
   ## Pre-requisitos {{#pre-requisitos}}   (se houver)
   ## Passo a passo {{#passos}}            (se for procedimento: passos numerados, executaveis, dizendo o que clicar e onde; sem depender de imagem)
   ## Resultado esperado {{#resultado}}
   ## Perguntas que este documento responde {{#perguntas}}  (3 a 6 perguntas como o usuario realmente perguntaria)
   ## Observacoes {{#observacoes}}         (se houver)

PRINCIPIOS:
- Um unico assunto, autocontido. Nao invente fatos que nao estao no texto: se faltar algo, deixe a secao enxuta ou o campo em branco.
- A primeira frase de cada secao resume o que ela resolve.
- Termo por extenso na primeira mencao, sigla entre parenteses depois.
- {tipo_linha}

Agora transforme o texto do colaborador a seguir."""
