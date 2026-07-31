"""
Email service for sending emails via Resend.
"""
from services import send_email, set_db as set_email_db

__all__ = ["send_email", "set_email_db"]
