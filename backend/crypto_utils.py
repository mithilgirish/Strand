import base64
import hashlib
import os

from cryptography.fernet import Fernet
from loguru import logger


def _get_fernet() -> Fernet:
    key = os.getenv("API_KEY", "strand-fallback-secret-key-12345")
    # Hash API_KEY to generate a fixed 32-byte key, then base64 encode it to satisfy Fernet requirements
    hashed = hashlib.sha256(key.encode("utf-8")).digest()
    fernet_key = base64.urlsafe_b64encode(hashed)
    return Fernet(fernet_key)


def _encrypt_token(token: str) -> str:
    if not token:
        return token
    try:
        f = _get_fernet()
        return f.encrypt(token.encode("utf-8")).decode("utf-8")
    except Exception as e:
        logger.error(f"Fernet encryption failed: {e}")
        return token


def _decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token:
        return encrypted_token

    # 1. Attempt Fernet decryption
    try:
        f = _get_fernet()
        return f.decrypt(encrypted_token.encode("utf-8")).decode("utf-8")
    except Exception:
        pass

    # 2. Fall back to old XOR decryption
    try:
        key = os.getenv("API_KEY", "strand-fallback-secret-key-12345")
        key_bytes = key.encode("utf-8")
        encrypted_bytes = base64.b64decode(encrypted_token.encode("utf-8"))
        decrypted_bytes = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(encrypted_bytes))
        return decrypted_bytes.decode("utf-8")
    except Exception:
        # 3. Fall back to raw plaintext
        return encrypted_token
