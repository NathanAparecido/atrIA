"""
CorpAI — Base compartilhada dos models SQLAlchemy.
Todos os models DEVEM importar Base daqui para garantir
que o metadata é único e as ForeignKeys resolvam corretamente.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
