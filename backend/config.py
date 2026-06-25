from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    
    ANTHROPIC_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    LLM_PROVIDER: str = "groq"
    LLM_MODEL: str = "llama-3.1-8b-instant"
    
    NEO4J_URI: str = "neo4j+s://localhost"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = ""
    
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    CHROMA_COLLECTION: str = "strand_docs"
    
    UNSTRUCTURED_API_KEY: str = ""
    
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081"
    
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"

settings = Settings()
