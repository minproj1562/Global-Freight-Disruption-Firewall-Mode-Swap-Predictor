# backend/app/services/email_service.py
"""
Transactional Email & Verification Dispatch Service.
Supports outbound SMTP with TLS, timeout resilience, and honest delivery status.
When SMTP is unconfigured in development/testing, returns explicit SMTP_UNCONFIGURED status
without claiming an email was sent.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailVerificationService:
    """
    Email delivery service for account verification and security alerts.
    Configured via SMTP environment variables:
      - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_TLS
    """
    def __init__(self):
        self.host = getattr(settings, 'SMTP_HOST', None)
        self.port = getattr(settings, 'SMTP_PORT', 587)
        self.user = getattr(settings, 'SMTP_USER', None)
        self.password = getattr(settings, 'SMTP_PASSWORD', None)
        self.from_email = getattr(settings, 'SMTP_FROM', 'noreply@freightdisruption.internal')
        self.use_tls = getattr(settings, 'SMTP_TLS', True)

    @property
    def is_configured(self) -> bool:
        """Check whether live SMTP dispatch is configured"""
        return bool(self.host and len(self.host.strip()) > 0)

    def send_verification_email(
        self,
        to_email: str,
        username: str,
        verification_token: str,
        base_url: str = "http://localhost:8000"
    ) -> Dict[str, Any]:
        """
        Dispatch an email verification link to the user.
        If SMTP is unconfigured, logs honest status and returns metadata.
        Never fabricates successful delivery.
        """
        verify_url = f"{base_url}/api/auth/verify-email"

        if not self.is_configured:
            logger.info(
                "[EmailService] Outbound SMTP server not configured in environment. "
                "Verification token generated for %s (%s).", username, to_email
            )
            return {
                "delivered": False,
                "status": "SMTP_UNCONFIGURED",
                "message": (
                    "Outbound SMTP server is not configured in environment variables (SMTP_HOST is empty). "
                    "In development/test mode, use the token returned by the registration/resend endpoint."
                ),
                "recipient": to_email,
                "verification_url": verify_url
            }

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Verify Your Port Operations Account - Global Freight Firewall"
            msg["From"] = self.from_email
            msg["To"] = to_email

            text_content = (
                f"Hello {username},\n\n"
                f"Please verify your email address for the Global Freight Disruption Firewall.\n"
                f"Verification Token: {verification_token}\n\n"
                f"Submit this token to {verify_url} within 24 hours to activate your account.\n\n"
                f"Global Maritime Operations Security Team"
            )
            html_content = f"""
            <html>
              <body>
                <h2>Global Freight Disruption Firewall</h2>
                <p>Hello <strong>{username}</strong>,</p>
                <p>Your Port Manager / Analyst account has been registered.</p>
                <p><strong>Your 24-hour verification token:</strong></p>
                <pre style="background:#f4f4f4;padding:10px;border-radius:4px;">{verification_token}</pre>
                <p>Post this token to <code>{verify_url}</code> to verify your email.</p>
                <hr>
                <small>Global Maritime Operations Security Team</small>
              </body>
            </html>
            """
            msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(self.host, self.port, timeout=8.0) as server:
                if self.use_tls:
                    server.starttls()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.send_message(msg)

            logger.info("[EmailService] Verification email successfully sent to %s", to_email)
            return {
                "delivered": True,
                "status": "DELIVERED",
                "message": f"Verification email dispatched to {to_email}",
                "recipient": to_email
            }

        except Exception as exc:
            logger.warning("[EmailService] Failed to dispatch verification email to %s: %s", to_email, exc)
            return {
                "delivered": False,
                "status": "DELIVERY_FAILED",
                "message": f"SMTP dispatch failed: {str(exc)}",
                "recipient": to_email
            }


email_service = EmailVerificationService()
