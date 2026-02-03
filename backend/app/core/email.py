"""
Email service for sending notifications
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None
) -> bool:
    """
    Send an email notification
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: HTML email body
        text_body: Plain text email body (optional)
    
    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.SMTP_ENABLED:
        logger.info(f"Email notifications disabled. Would send to {to_email}: {subject}")
        return False
    
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP configuration incomplete. Email not sent.")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg['To'] = to_email
        
        # Add text and HTML parts
        if text_body:
            text_part = MIMEText(text_body, 'plain')
            msg.attach(text_part)
        
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}", exc_info=True)
        return False


def send_user_creation_notification(
    user_email: str,
    user_name: str,
    user_password: str,
    user_role: str,
    platform_url: str = "http://localhost:3003"
) -> bool:
    """
    Send notification email when a new user is created
    
    Args:
        user_email: New user's email address
        user_name: New user's full name
        user_password: New user's password (will be included in email)
        user_role: New user's role
        platform_url: URL to the platform
    
    Returns:
        True if email sent successfully, False otherwise
    """
    role_display = {
        "admin": "Administrator",
        "pmm": "Product Marketing Manager",
        "sales": "Sales"
    }.get(user_role, user_role.title())
    
    subject = "Welcome to Products & Solutions Enablement Platform"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background: linear-gradient(135deg, #0050d7 0%, #003d9e 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }}
            .content {{
                background: #f9fafb;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
            }}
            .credentials {{
                background: white;
                border: 2px solid #0050d7;
                border-radius: 6px;
                padding: 20px;
                margin: 20px 0;
            }}
            .credential-item {{
                margin: 10px 0;
                font-size: 14px;
            }}
            .credential-label {{
                font-weight: bold;
                color: #0050d7;
                display: inline-block;
                width: 120px;
            }}
            .button {{
                display: inline-block;
                background: #0050d7;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: bold;
            }}
            .footer {{
                text-align: center;
                color: #6b7280;
                font-size: 12px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
            }}
            .warning {{
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Welcome to Products & Solutions Enablement</h1>
        </div>
        <div class="content">
            <p>Hello {user_name},</p>
            
            <p>Your account has been created on the <strong>Products & Solutions Enablement Platform</strong>.</p>
            
            <p>You have been assigned the role: <strong>{role_display}</strong></p>
            
            <div class="credentials">
                <h3 style="margin-top: 0; color: #0050d7;">Your Login Credentials</h3>
                <div class="credential-item">
                    <span class="credential-label">Email:</span>
                    <span>{user_email}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Password:</span>
                    <span><strong>{user_password}</strong></span>
                </div>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
            </div>
            
            <p>
                <a href="{platform_url}/login" class="button">Access the Platform</a>
            </p>
            
            <p>If you have any questions or need assistance, please contact your administrator.</p>
        </div>
        <div class="footer">
            <p>© 2026 OVHcloud Products & Solutions Enablement Platform</p>
            <p>This is an automated message. Please do not reply.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
Welcome to Products & Solutions Enablement Platform

Hello {user_name},

Your account has been created on the Products & Solutions Enablement Platform.

You have been assigned the role: {role_display}

Your Login Credentials:
Email: {user_email}
Password: {user_password}

⚠️ Important: Please change your password after your first login for security purposes.

Access the platform at: {platform_url}/login

If you have any questions or need assistance, please contact your administrator.

© 2026 OVHcloud Products & Solutions Enablement Platform
This is an automated message. Please do not reply.
    """
    
    return send_email(
        to_email=user_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body
    )
