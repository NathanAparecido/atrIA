"""
Configuração de testes do CorpAI.

Coloca a raiz do backend no path e instala um stub de `chromadb`, para que os
testes de lógica pura (chunking, front-matter, filtro) rodem sem precisar de um
servidor ChromaDB no ar — `services.chroma` constrói o client na importação.
"""

import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if "chromadb" not in sys.modules:
    chromadb_stub = types.ModuleType("chromadb")

    class _DummyClient:
        def __init__(self, *args, **kwargs):
            pass

    chromadb_stub.HttpClient = lambda *args, **kwargs: _DummyClient()

    config_stub = types.ModuleType("chromadb.config")

    class _Settings:
        def __init__(self, *args, **kwargs):
            pass

    config_stub.Settings = _Settings
    chromadb_stub.config = config_stub

    sys.modules["chromadb"] = chromadb_stub
    sys.modules["chromadb.config"] = config_stub
