# backend/app/services/totp_service.py
"""
TOTP (Time-based One-Time Password) Two-Factor Authentication Service.
Complies with RFC 6238 and RFC 4226 (HMAC-SHA1, 6 digits, 30s time step).
Generates secure Base32 secrets, OTPAuth provisioning URIs, and verifies codes with drift tolerance.
"""
import hmac
import hashlib
import time
import struct
import base64
import secrets
from typing import Tuple, Optional

class TOTPService:
    @staticmethod
    def generate_secret() -> str:
        """Generate a cryptographically secure 20-byte Base32 secret key"""
        random_bytes = secrets.token_bytes(20)
        return base64.b32encode(random_bytes).decode("utf-8").replace("=", "")

    @staticmethod
    def get_provisioning_uri(username: str, secret: str, issuer: str = "FreightDisruptionFirewall") -> str:
        """Generate standard otpauth:// URI for authenticator apps (Google Authenticator, Authy)"""
        return f"otpauth://totp/{issuer}:{username}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30"

    @staticmethod
    def generate_totp_code(secret: str, time_step: Optional[int] = None) -> str:
        """Calculate current 6-digit TOTP code for a given secret"""
        if time_step is None:
            time_step = int(time.time()) // 30

        # Decode base32 secret
        padding = "=" * ((8 - len(secret) % 8) % 8)
        key = base64.b32decode((secret + padding).upper())

        # Pack time step into big-endian 8-byte buffer
        msg = struct.pack(">Q", time_step)

        # HMAC-SHA1 digest
        digest = hmac.new(key, msg, hashlib.sha1).digest()

        # Dynamic truncation (RFC 4226)
        offset = digest[-1] & 0x0F
        code_int = (struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF) % 1_000_000

        return f"{code_int:06d}"

    @staticmethod
    def verify_totp_code(secret: str, code: str, tolerance_steps: int = 1) -> bool:
        """
        Verify a 6-digit code with window tolerance (tolerance_steps = 1 allows -30s, 0s, +30s).
        """
        if not secret or not code or len(code.strip()) != 6:
            return False

        clean_code = code.strip()
        current_step = int(time.time()) // 30

        for step_offset in range(-tolerance_steps, tolerance_steps + 1):
            calculated = TOTPService.generate_totp_code(secret, current_step + step_offset)
            if hmac.compare_digest(calculated, clean_code):
                return True

        return False

totp_service = TOTPService()
