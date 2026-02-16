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
        
        # Send email with increased timeout
        timeout = 30  # 30 seconds timeout
        if settings.SMTP_PORT == 465:
            # Use SMTP_SSL for port 465
            import ssl
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout, context=context) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            # Use regular SMTP with TLS for port 587
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout) as server:
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
                background-color: #0050d7 !important;
                color: #ffffff !important;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: bold;
                font-size: 16px;
                border: 2px solid #0050d7;
            }}
            a.button {{
                color: #ffffff !important;
            }}
            /* Fallback for email clients */
            table.button-table {{
                margin: 20px auto;
            }}
            table.button-table td {{
                background-color: #0050d7;
                border-radius: 6px;
                padding: 0;
            }}
            table.button-table a {{
                color: #ffffff !important;
                text-decoration: none;
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
            
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px auto;">
                <tr>
                    <td align="center" style="background-color: #0050d7; border-radius: 6px; padding: 12px 30px;">
                        <a href="{platform_url}/login" style="color: #ffffff !important; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; display: block; color: #ffffff;">Access the Platform</a>
                    </td>
                </tr>
            </table>
            
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


def send_share_link_notification(
    customer_email: str,
    customer_name: str,
    material_name: str,
    share_url: str,
    shared_by_name: str,
    platform_url: str = "http://localhost:3003"
) -> bool:
    """
    Send email notification when a document is shared with a customer
    
    Args:
        customer_email: Customer's email address
        customer_name: Customer's name or company name
        material_name: Name of the shared document
        share_url: URL to access the shared document
        shared_by_name: Name of the person who shared the document
        platform_url: URL to the platform
    
    Returns:
        True if email sent successfully, False otherwise
    """
    # Use customer name or fallback to a friendly greeting
    greeting_name = customer_name if customer_name else "Valued Customer"
    
    subject = f"Discover our {material_name} - OVHcloud"
    
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
            .document-box {{
                background: white;
                border: 2px solid #0050d7;
                border-radius: 6px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
            }}
            .document-name {{
                font-size: 18px;
                font-weight: bold;
                color: #0050d7;
                margin-bottom: 10px;
            }}
            .button {{
                display: inline-block;
                background-color: #0050d7 !important;
                color: #ffffff !important;
                padding: 14px 35px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: bold;
                font-size: 16px;
                border: 2px solid #0050d7;
            }}
            a.button {{
                color: #ffffff !important;
            }}
            table.button-table {{
                margin: 20px auto;
            }}
            table.button-table td {{
                background-color: #0050d7;
                border-radius: 6px;
                padding: 0;
            }}
            table.button-table a {{
                color: #ffffff !important;
                text-decoration: none;
                display: block;
                padding: 14px 35px;
            }}
            .footer {{
                text-align: center;
                color: #6b7280;
                font-size: 12px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
            }}
            .signature {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>OVHcloud</h1>
        </div>
        <div class="content">
            <p>Dear {greeting_name},</p>
            
            <p>We hope this message finds you well.</p>
            
            <p>We're excited to share with you a valuable resource that we believe will be of great interest to you. <strong>{shared_by_name}</strong> has prepared a document that we think you'll find particularly relevant.</p>
            
            <div class="document-box">
                <div class="document-name">{material_name}</div>
                <p style="margin: 10px 0; color: #6b7280; font-size: 14px;">Available for your review and download</p>
            </div>
            
            <p style="text-align: center; margin: 25px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="button-table">
                    <tr>
                        <td align="center">
                            <a href="{share_url}" class="button">Discover the Document</a>
                        </td>
                    </tr>
                </table>
            </p>
            
            <p>Simply click the button above to access the document. You'll be able to view and download it at your convenience.</p>
            
            <p>We're committed to providing you with the best possible support and resources. If you have any questions or would like to discuss this further, please don't hesitate to reach out to us.</p>
            
            <div class="signature">
                <p>Best regards,<br>
                <strong>OVHcloud Team</strong></p>
                <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                    This link will remain active for your convenience. If you have any questions, please contact your OVHcloud representative.
                </p>
            </div>
        </div>
        <div class="footer">
            <p>© 2026 OVHcloud. All rights reserved.</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
OVHcloud - Document Shared with You

Dear {greeting_name},

We hope this message finds you well.

We're excited to share with you a valuable resource that we believe will be of great interest to you. {shared_by_name} has prepared a document that we think you'll find particularly relevant.

Document: {material_name}

You can access and download this document by clicking the following link:
{share_url}

Simply click the link above to access the document. You'll be able to view and download it at your convenience.

We're committed to providing you with the best possible support and resources. If you have any questions or would like to discuss this further, please don't hesitate to reach out to us.

Best regards,
OVHcloud Team

This link will remain active for your convenience. If you have any questions, please contact your OVHcloud representative.

© 2026 OVHcloud. All rights reserved.
This is an automated message. Please do not reply directly to this email.
    """
    
    return send_email(
        to_email=customer_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body
    )
