# backend/app/core/encryption.py
"""
Financial Field Encryption Engine (AES-256-GCM & PostgreSQL pgcrypto).
Provides genuine 256-bit AES encryption for sensitive financial figures:
  - Application-layer: AES-256-GCM (Galois/Counter Mode, AEAD) using cryptography.hazmat.
    Key is 256-bit (32 bytes) derived via PBKDF2-HMAC-SHA256 (100,000 iterations).
  - Database-layer: PostgreSQL pgcrypto AES-256 (pgp_sym_encrypt with cipher-algo=aes256).

Ensures sensitive figures (cargo valuation, cost savings, exposure values) are encrypted at rest,
decrypted only in-memory during authorization checks, and masked in audit/application logs.
"""
import os
import base64
from typing import Union, Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.fernet import Fernet
from app.core.config import settings

AES256_PREFIX = "aes256gcm$"

def _derive_aes256_key(secret_key: str) -> bytes:
    """
    Derive a 256-bit (32-byte) raw key for AES-256-GCM from SECRET_KEY using PBKDF2-HMAC-SHA256.
    Uses 100,000 iterations and dedicated cryptographic salt.
    """
    salt = b"freight_firewall_financial_salt_2026_aes256"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # Exactly 256 bits for AES-256
        salt=salt,
        iterations=100_000,
    )
    return kdf.derive(secret_key.encode("utf-8"))

def _derive_legacy_fernet_key(secret_key: str) -> bytes:
    """Derive legacy 32-byte URL-safe base64 key for backward compatibility with existing Fernet tokens"""
    salt = b"freight_firewall_financial_salt_2026"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    return base64.urlsafe_b64encode(kdf.derive(secret_key.encode("utf-8")))


class FinancialEncryptionService:
    """
    High-assurance financial data encryption service.
    Implements genuine AES-256-GCM authenticated encryption with automatic nonce generation
    and backward-compatible decryption for legacy tokens and PostgreSQL pgcrypto interoperability.
    """
    def __init__(self):
        secret = getattr(settings, 'SECRET_KEY', 'default-financial-encryption-secret-key-32b')
        self._raw_key_256 = _derive_aes256_key(secret)
        self._aesgcm = AESGCM(self._raw_key_256)
        
        # Legacy fallback cipher for existing stored Fernet tokens
        self._legacy_key = _derive_legacy_fernet_key(secret)
        self._legacy_cipher = Fernet(self._legacy_key)

    @property
    def algorithm(self) -> str:
        return "AES-256-GCM (NIST SP 800-38D Authenticated Encryption)"

    def encrypt_amount(self, amount: Union[float, int]) -> str:
        """
        Encrypt a numeric financial amount using AES-256-GCM.
        Generates a unique 12-byte cryptographic nonce per encryption.
        Returns a base64-encoded string prefixed with 'aes256gcm$'.
        """
        if amount is None:
            return ""
        val_bytes = str(float(amount)).encode("utf-8")
        nonce = os.urandom(12)  # Standard 96-bit nonce for AES-GCM
        ciphertext = self._aesgcm.encrypt(nonce, val_bytes, None)
        token_payload = base64.urlsafe_b64encode(nonce + ciphertext).decode("utf-8")
        return f"{AES256_PREFIX}{token_payload}"

    def decrypt_amount(self, encrypted_token: str, default: float = 0.0) -> float:
        """
        Decrypt an encrypted token back into a numeric float in memory.
        Supports:
          1. AES-256-GCM tokens (starts with 'aes256gcm$')
          2. Legacy Fernet tokens (for zero-downtime migration)
          3. Plaintext numbers (graceful fallback for unencrypted legacy rows)
        """
        if not encrypted_token or not isinstance(encrypted_token, str):
            return default

        # 1. AES-256-GCM path
        if encrypted_token.startswith(AES256_PREFIX):
            try:
                b64_payload = encrypted_token[len(AES256_PREFIX):]
                raw = base64.urlsafe_b64decode(b64_payload.encode("utf-8"))
                nonce = raw[:12]
                ciphertext = raw[12:]
                decrypted_bytes = self._aesgcm.decrypt(nonce, ciphertext, None)
                return float(decrypted_bytes.decode("utf-8"))
            except Exception:
                return default

        # 2. Legacy Fernet token path
        try:
            decrypted_bytes = self._legacy_cipher.decrypt(encrypted_token.encode("utf-8"))
            return float(decrypted_bytes.decode("utf-8"))
        except Exception:
            pass

        # 3. Raw float string fallback during migration
        try:
            return float(encrypted_token)
        except ValueError:
            return default

    @staticmethod
    def mask_financial_value(amount: float) -> str:
        """
        Produce masked summary for audit and diagnostic logs without exposing exact numbers.
        Ensures zero financial plaintext leakage in logs.
        """
        if amount is None:
            return "$0"
        if amount >= 1_000_000:
            return f"${round(amount / 1_000_000, 1)}M (Masked)"
        elif amount >= 1_000:
            return f"${round(amount / 1_000, 1)}K (Masked)"
        return "$*** (Masked)"

    @staticmethod
    def get_pgcrypto_encrypt_sql(value_expr: str, key: str) -> str:
        """SQL expression for database-level AES-256 encryption via PostgreSQL pgcrypto"""
        return f"pgp_sym_encrypt(CAST({value_expr} AS text), '{key}', 'cipher-algo=aes256')"

    @staticmethod
    def get_pgcrypto_decrypt_sql(col_expr: str, key: str) -> str:
        """SQL expression for database-level AES-256 decryption via PostgreSQL pgcrypto"""
        return f"CAST(pgp_sym_decrypt({col_expr}, '{key}') AS double precision)"


financial_encryption = FinancialEncryptionService()
