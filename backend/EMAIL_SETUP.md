# Email Notification Setup

## Overview

The platform can send email notifications when new users are created. This feature is disabled by default and must be configured.

## Configuration

### Step 1: Enable Email Notifications

Add the following variables to your `backend/.env` file:

```bash
# Email Configuration
SMTP_ENABLED=true
SMTP_HOST=smtp.ovh.net
SMTP_PORT=587
SMTP_USER=your-email@ovhcloud.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@ovhcloud.com
SMTP_FROM_NAME=Products & Solutions Enablement
SMTP_USE_TLS=true
PLATFORM_URL=http://localhost:3003
```

### Step 2: OVHcloud SMTP Settings

For OVHcloud email accounts, use these settings:

- **SMTP Host:** `smtp.ovh.net` (or `ssl0.ovh.net` for SSL)
- **SMTP Port:** `587` (TLS) or `465` (SSL)
- **SMTP User:** Your full email address
- **SMTP Password:** Your email account password
- **TLS:** Enabled (port 587) or SSL (port 465)

### Step 3: Other SMTP Providers

#### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use App Password, not regular password
SMTP_USE_TLS=true
```

#### Microsoft 365 / Outlook
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
SMTP_USE_TLS=true
```

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_USE_TLS=true
```

## Testing

### Test Email Configuration

You can test the email configuration by creating a new user through the admin interface. If email is properly configured, the new user will receive a welcome email with their login credentials.

### Check Logs

Email sending is logged. Check the backend logs for:
- `Email sent successfully to {email}` - Email sent
- `Email notifications disabled` - SMTP_ENABLED=false
- `SMTP configuration incomplete` - Missing SMTP credentials
- `Failed to send email` - SMTP error (check credentials/host)

## Email Template

The welcome email includes:
- Welcome message
- User's name and role
- Login credentials (email and password)
- Link to the platform
- Security reminder to change password

## Security Notes

1. **Password in Email:** The welcome email includes the initial password. Users are reminded to change it after first login.

2. **SMTP Credentials:** Store SMTP credentials securely in `.env` file (never commit to git).

3. **Email Failures:** If email sending fails, user creation still succeeds. Check logs for email errors.

## Disabling Email Notifications

To disable email notifications, set:
```bash
SMTP_ENABLED=false
```

When disabled, user creation will still work, but no emails will be sent.
