"""
Neo4j driver with session factory, health check, and graceful
fallback to NetworkX in-memory graph if Aura times out.
All Cypher queries MUST use parameterized queries.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Optional

import networkx as nx
from loguru import logger

from backend.config import settings
from backend.errors import StrandGraphError, StrandGraphUnavailableError


class Neo4jClient:
    """Neo4j driver singleton with NetworkX fallback."""

    def __init__(self):
        self._driver = None
        self._fallback_graph: nx.DiGraph | None = None
        self._using_fallback = False
        self._connect()

    def _connect(self):
        if not settings.NEO4J_PASSWORD:
            logger.warning("NEO4J_PASSWORD not set — using NetworkX in-memory fallback")
            self._use_fallback()
            return

        try:
            from neo4j import GraphDatabase

            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                max_connection_lifetime=300,
                connection_timeout=settings.NEO4J_TIMEOUT,
            )
            # Verify connectivity
            self._driver.verify_connectivity()
            logger.info("Neo4j connected successfully", uri=settings.NEO4J_URI)
        except Exception as e:
            logger.warning(f"Neo4j unavailable, falling back to NetworkX: {e}")
            self._use_fallback()

    def _use_fallback(self):
        self._driver = None
        self._fallback_graph = nx.DiGraph()
        self._using_fallback = True

    @property
    def is_fallback(self) -> bool:
        return self._using_fallback

    @contextmanager
    def get_session(self, default_access_mode: str | None = None):
        """
        Get a Neo4j session (or a fallback wrapper).
        Usage:
            with neo4j_client.get_session() as session:
                result = session.run("MATCH ...", param=value)
        """
        if self._using_fallback and settings.NEO4J_PASSWORD:
            self._connect()

        if self._driver:
            session_kwargs = {}
            if settings.NEO4J_DATABASE:
                session_kwargs["database"] = settings.NEO4J_DATABASE
            if default_access_mode:
                session_kwargs["default_access_mode"] = default_access_mode
            session = self._driver.session(**session_kwargs)
            try:
                yield session
            except Exception as e:
                logger.error(f"Neo4j session error: {e}")
                raise StrandGraphError(message=str(e))
            finally:
                session.close()
        else:
            yield _NetworkXSession(self._fallback_graph)

    def verify_connectivity(self) -> bool:
        """Return True when the configured Neo4j driver can connect."""
        if not self._driver:
            return False
        try:
            self._driver.verify_connectivity()
            return True
        except Exception as e:
            logger.warning(f"Neo4j connectivity check failed: {e}")
            return False

    def execute_query(self, query: str, parameters: dict | None = None) -> list[dict]:
        """Execute a Cypher query and return results as list of dicts."""
        if self._using_fallback:
            logger.debug(f"Fallback graph query (no-op): {query[:80]}...")
            raise StrandGraphUnavailableError(message="Graph operations are not supported in fallback mode")

        try:
            with self.get_session() as session:
                result = session.run(query, parameters or {})
                return [record.data() for record in result]
        except StrandGraphError:
            raise
        except Exception as e:
            raise StrandGraphError(message=f"Query execution failed: {e}")

    def execute_write(self, query: str, parameters: dict | None = None) -> list[dict]:
        """Execute a write Cypher query (MERGE, CREATE, DELETE)."""
        if self._using_fallback:
            logger.debug(f"Fallback graph write (no-op): {query[:80]}...")
            raise StrandGraphUnavailableError(message="Graph operations are not supported in fallback mode")

        try:
            with self.get_session() as session:
                result = session.run(query, parameters or {})
                return [record.data() for record in result]
        except Exception as e:
            raise StrandGraphError(message=f"Write execution failed: {e}")

    def health(self) -> dict:
        """Health check for the /health endpoint."""
        if self._using_fallback:
            return {
                "status": "fallback",
                "backend": "networkx",
                "node_count": self._fallback_graph.number_of_nodes() if self._fallback_graph else 0,
            }
        try:
            self._driver.verify_connectivity()
            return {"status": "ok", "backend": "neo4j", "uri": settings.NEO4J_URI}
        except Exception as e:
            return {"status": "error", "backend": "neo4j", "error": str(e)}

    def close(self):
        if self._driver:
            self._driver.close()


class _NetworkXSession:
    """Minimal session interface backed by NetworkX for dev/fallback."""

    def __init__(self, graph: nx.DiGraph):
        self.graph = graph

    def run(self, query: str, parameters: dict | None = None, **kwargs) -> _NetworkXResult:
        logger.debug(f"NetworkX fallback — query not executed: {query[:60]}...")
        raise StrandGraphUnavailableError(message="Graph operations are not supported in fallback mode")


class _NetworkXResult:
    """Minimal result wrapper for NetworkX fallback."""

    def __init__(self, data: list):
        self._data = data

    def data(self) -> list[dict]:
        return self._data

    def single(self) -> dict | None:
        return self._data[0] if self._data else None


# ── Singleton ────────────────────────────────────────────────────────
neo4j_client = Neo4jClient()


def get_neo4j_session(default_access_mode: str | None = None):
    """Convenience alias used throughout the codebase."""
    return neo4j_client.get_session(default_access_mode=default_access_mode)
