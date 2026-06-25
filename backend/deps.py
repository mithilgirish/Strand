# backend/deps.py

class Neo4jClientStub:
    def __init__(self):
        pass

class ChromaClientStub:
    def __init__(self):
        pass

# Singletons for dependency injection/access
neo4j_client = Neo4jClientStub()
chroma_client = ChromaClientStub()
