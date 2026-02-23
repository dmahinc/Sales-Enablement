# Customer Persona Implementation

## Overview
The Customer Persona feature has been implemented to provide customers with a dedicated portal to access shared materials and communicate with their sales contacts.

## Implementation Summary

### Backend Changes

1. **User Model & Schemas** (`backend/app/models/user.py`, `backend/app/schemas/user.py`)
   - Added "customer" as a valid role
   - Updated validation patterns to include customer role

2. **Customer Message Model** (`backend/app/models/customer_message.py`)
   - New model for customer-sales communication
   - Supports threaded conversations
   - Tracks read/unread status

3. **Customer API** (`backend/app/api/customers.py`)
   - `/api/customers/dashboard` - Get customer dashboard data
   - `/api/customers/messages` - Get customer messages
   - `/api/customers/messages` (POST) - Send message to sales contact
   - `/api/customers/messages/{id}/read` - Mark message as read

4. **Database Migration** (`backend/alembic/versions/010_add_customer_messages.py`)
   - Creates `customer_messages` table
   - Adds indexes for performance

### Frontend Changes

1. **Customer Dashboard** (`frontend/src/pages/CustomerDashboard.tsx`)
   - Displays shared materials
   - Shows sales contacts
   - Message interface
   - Material download/view functionality

2. **Routing** (`frontend/src/App.tsx`)
   - Added customer role routing
   - Customer dashboard accessible at `/`

3. **Layout** (`frontend/src/components/Layout.tsx`)
   - Simplified navigation for customers
   - Customer-specific menu items

## Database Setup

**Note:** The migration file exists but may need manual table creation if migration chain has issues. Run this SQL:

```sql
CREATE TABLE IF NOT EXISTS customer_messages (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sales_contact_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    sent_by_customer BOOLEAN NOT NULL DEFAULT true,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP,
    parent_message_id INTEGER REFERENCES customer_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_messages_customer ON customer_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_sales ON customer_messages(sales_contact_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_thread ON customer_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_unread ON customer_messages(customer_id, is_read);
```

## Customer Registration

Customers can register via the existing `/api/auth/register` endpoint with `role: "customer"`.

## Suggested Customer Experiences

### 1. **Material Discovery & Organization**
- **Material Library**: Categorized view of all shared materials by product, universe, or type
- **Favorites/Bookmarks**: Allow customers to bookmark frequently accessed materials
- **Search & Filter**: Advanced search by keywords, product name, material type
- **Recent Activity**: Quick access to recently viewed/downloaded materials
- **Material Recommendations**: AI-powered suggestions based on viewing history

### 2. **Enhanced Communication**
- **Live Chat**: Real-time chat with sales contacts (WebSocket integration)
- **Video Calls**: Schedule and join video meetings directly from the portal
- **File Sharing**: Customers can upload files/questions to share with sales team
- **Meeting Requests**: Request meetings with sales contacts
- **FAQ/Knowledge Base**: Self-service answers to common questions

### 3. **Engagement & Analytics**
- **Usage Dashboard**: Customers see their own engagement metrics
- **Material Engagement Timeline**: Visual timeline of their interactions with materials
- **Download History**: Complete history of downloaded materials
- **Interest Tracking**: Track which products/materials they're most interested in

### 4. **Personalization**
- **Customizable Dashboard**: Drag-and-drop widgets for personalized layout
- **Notification Preferences**: Choose what notifications to receive
- **Language Selection**: Multi-language support for international customers
- **Theme Customization**: Personal branding/color preferences

### 5. **Collaboration Features**
- **Team Workspaces**: If customer has multiple users, shared workspaces
- **Comments & Annotations**: Add notes/comments on materials
- **Share with Colleagues**: Forward materials to team members
- **Collaborative Notes**: Shared notes with sales team

### 6. **Integration & Automation**
- **Calendar Integration**: Sync meetings and deadlines
- **Email Integration**: Receive email notifications for new shares/messages
- **Mobile App**: Native mobile app for on-the-go access
- **API Access**: REST API for customers to integrate with their systems

### 7. **Learning & Enablement**
- **Interactive Demos**: Embedded product demos and walkthroughs
- **Training Tracks**: Access to enablement tracks tailored for customers
- **Certification Programs**: Track progress on certifications
- **Webinar Access**: Recorded and live webinar access

### 8. **Support & Resources**
- **Support Tickets**: Create and track support tickets
- **Documentation Hub**: Access to product documentation
- **Community Forum**: Connect with other customers
- **Feedback Portal**: Submit product feedback and feature requests

### 9. **Business Intelligence**
- **ROI Calculator**: Tools to calculate ROI of solutions
- **Comparison Tools**: Compare different products/solutions
- **Pricing Information**: Access to pricing and quotes
- **Contract Management**: View and manage contracts

### 10. **Gamification**
- **Achievement Badges**: Earn badges for engagement milestones
- **Leaderboards**: See how you compare (anonymized) with other customers
- **Points System**: Earn points for activities
- **Rewards**: Unlock exclusive content or benefits

## Next Steps

1. **Complete Database Migration**: Ensure customer_messages table is created
2. **Customer Registration Flow**: Create customer-friendly registration page
3. **Email Notifications**: Notify customers when materials are shared
4. **Sales Team Integration**: Allow sales team to send messages to customers
5. **Testing**: Create test customer accounts and verify functionality
6. **Documentation**: Create customer-facing documentation

## Testing

To test the customer persona:

1. Register a customer account:
```bash
POST /api/auth/register
{
  "email": "customer@example.com",
  "full_name": "Test Customer",
  "password": "SecurePassword123",
  "role": "customer"
}
```

2. Share a material with the customer (as sales/director/PMM)
3. Login as customer and access dashboard
4. Test messaging functionality
