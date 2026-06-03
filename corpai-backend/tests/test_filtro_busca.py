"""Testes da montagem do filtro `where` do Chroma (services.rag.montar_filtro_busca)."""

from services.rag import montar_filtro_busca, _hoje_ordinal


def test_filtro_padrao_exclui_vencidos():
    where = montar_filtro_busca()
    assert where == {"valido_ate_ord": {"$gte": _hoje_ordinal()}}


def test_filtro_com_setor_e_tipo_usa_and():
    where = montar_filtro_busca(setor="noc", tipo="procedimento")
    assert "$and" in where
    cond = where["$and"]
    assert {"valido_ate_ord": {"$gte": _hoje_ordinal()}} in cond
    assert {"setor": "noc"} in cond
    assert {"tipo": "procedimento"} in cond
    assert len(cond) == 3


def test_incluir_vencidos_sem_filtros_retorna_none():
    assert montar_filtro_busca(incluir_vencidos=True) is None


def test_incluir_vencidos_com_um_filtro_retorna_condicao_simples():
    where = montar_filtro_busca(sistema="zabbix", incluir_vencidos=True)
    assert where == {"sistema": "zabbix"}
