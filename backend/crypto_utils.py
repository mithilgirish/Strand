import os
import base64

def _encrypt_token(token: str) -> str:
    if not token:
        return token
    key = os.getenv("API_KEY", "strand-fallback-secret-key-12345")
    encrypted = "".join(chr(ord(c) ^ ord(key[i % len(key)])) for i, c in enumerate(token))
    return base64.b64encode(encrypted.encode('utf-8')).decode('utf-8')

def _decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token:
        return encrypted_token
    try:
        key = os.getenv("API_KEY", "strand-fallback-secret-key-12345")
        decoded = base64.b64decode(encrypted_token.encode('utf-8')).decode('utf-8')
        return "".join(chr(ord(c) ^ ord(key[i % len(key)])) for i, c in enumerate(decoded))
    except Exception:
        # If decryption fails (e.g., was not encrypted), return as-is for backward compatibility
        return encrypted_token
