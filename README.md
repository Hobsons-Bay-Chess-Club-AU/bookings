# Event Booking System MVP

A full-stack event booking system built with Next.js, Supabase, and Stripe. This application allows users to browse events, make bookings, and process payments, while providing organizers with tools to create and manage events.

## Features

### For Users
- **Browse Events**: View published events with details, pricing, and availability
- **User Authentication**: Secure signup/login with Supabase Auth
- **Event Booking**: Book tickets for events with quantity selection
- **Payment Processing**: Secure payments via Stripe integration
- **Booking Management**: View booking history and status in dashboard
- **Profile Management**: Update personal information

### For Organizers/Admins
- **Event Creation**: Create and manage events with detailed information
- **Event Management**: Edit events, view bookings, and track revenue
- **Role-based Access**: Different permissions for users, organizers, and admins
- **Booking Analytics**: View booking statistics and revenue data
- **Content Management**: Full CMS system for managing static website content
- **Version Control**: Track content changes with automatic versioning
- **SEO Management**: Built-in meta tag and keyword management

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Deployment**: Vercel-ready

## Database Schema

The application uses the following main tables:

- **profiles**: User profiles with roles (user, organizer, admin)
- **events**: Event information with organizer details
- **bookings**: Booking records with payment status
- **content**: CMS content with Markdown support and versioning
- **content_history**: Version history for all content changes

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd bookings
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and keys
3. Run the SQL schema from `supabase/schema.sql` in the Supabase SQL editor
4. Enable Row Level Security (RLS) policies are included in the schema

**Important**: If you're updating from an older version or encounter database issues, see the [SCHEMA_MIGRATION.md](SCHEMA_MIGRATION.md) guide for:
- Complete database reset instructions
- Step-by-step migration from old schema
- Quick fixes for infinite recursion errors
- Manual cleanup options

### 4. Test Users Setup (Optional)

To set up test users for development and testing:

1. **Create users in Supabase Auth Dashboard:**
   - Go to Authentication > Users in your Supabase dashboard
   - Create the following test users:
     - `admin@eventbooking.com` (password: `admin123`)
     - `organizer@eventbooking.com` (password: `organizer123`)
     - `user@eventbooking.com` (password: `user123`)

2. **Get User UUIDs:**
   - After creating users, note their UUIDs from the Auth dashboard
   - Or run this query in the SQL editor: `SELECT id, email FROM auth.users;`

3. **Run the test data script:**
   - Open `supabase/users.sql`
   - Replace the placeholder UUIDs with actual user UUIDs
   - Run the script in the Supabase SQL editor

This will create:
- Test users with appropriate roles (admin, organizer, user)
- Sample events (published and draft)
- Sample bookings for testing

**Quick Role Update Functions:**
```sql
-- Use these functions to quickly update user roles
SELECT update_user_role('admin@eventbooking.com', 'admin');
SELECT update_user_role('organizer@eventbooking.com', 'organizer');

-- Make any existing user an admin
SELECT make_user_admin('any-user@example.com');

-- Make the first registered user admin (useful for initial setup)
SELECT make_first_user_admin();
```

### Admin Role Management

The system includes comprehensive admin role management scripts in `supabase/users.sql`:

**Quick Admin Setup Options:**
1. **By Email**: `SELECT make_user_admin('user@example.com');`
2. **By UUID**: `SELECT make_user_admin_by_id('user-uuid-here');`
3. **First User**: `SELECT make_first_user_admin();` (makes the oldest user admin)
4. **Multiple Users**: `SELECT make_multiple_users_admin(ARRAY['user1@example.com', 'user2@example.com']);`
5. **Direct SQL**: `UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';`

**Verification Queries:**
```sql
-- Check all users and their roles
SELECT email, full_name, role, created_at FROM profiles ORDER BY created_at;

-- Check only admin users
SELECT email, full_name, role FROM profiles WHERE role = 'admin';

-- Count users by role
SELECT role, COUNT(*) as count FROM profiles GROUP BY role;
```

### 5. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe dashboard
3. Set up a webhook endpoint pointing to `your-domain/api/webhooks/stripe`
4. Configure webhook events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`

### 6. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## User Roles and Permissions

### User (Default)
- Browse and book events
- View personal bookings
- Update profile

### Organizer
- All user permissions
- Create and manage events
- View event bookings and analytics

### Admin
- All organizer permissions
- Access to all events and bookings
- User management capabilities
- **Content Management System** - Create and manage static website content
- **Version Control** - Track all content changes with automatic versioning
- **SEO Management** - Manage meta descriptions and keywords

## API Endpoints

### Public API
- `GET /content/[slug]` - Render published content pages
- `GET /api/content/[slug]` - Get published content by slug

### Admin API
- `GET /api/admin/content` - List all content (admin only)
- `POST /api/admin/content` - Create new content (admin only)
- `GET /api/admin/content/[id]` - Get content by ID (admin only)
- `PUT /api/admin/content/[id]` - Update content (admin only)
- `DELETE /api/admin/content/[id]` - Delete content (admin only)
- `GET /api/admin/content/[id]/history` - Get content version history (admin only)

### Booking API
- `POST /api/create-checkout-session` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Handle Stripe webhook events

## Key Features Implementation

### Authentication Flow
- Supabase Auth handles user registration and login
- Middleware protects routes based on authentication status
- Role-based access control for different user types

### Booking Process
1. User selects event and quantity
2. Booking record created with "pending" status
3. For paid events: Stripe checkout session created
4. Payment completion updates booking to "confirmed"
5. Webhook handles payment status updates

### Event Management
- Organizers can create, edit, and manage events
- Real-time attendee count updates
- Revenue tracking and analytics

### Content Management System (CMS)
- **Markdown Editor** with live preview for rich content creation
- **Version History** automatically tracks all content changes
- **SEO Optimization** with meta descriptions and keywords
- **Draft/Published Status** for content workflow management
- **Dynamic Routing** - published content accessible at `/content/{slug}`
- **Admin-only Access** with role-based security

## File Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   │   └── admin/content/ # CMS API endpoints
│   ├── auth/              # Authentication pages
│   ├── booking/           # Booking-related pages
│   ├── dashboard/         # User dashboard
│   ├── events/            # Event pages
│   ├── organizer/         # Organizer dashboard
│   ├── admin/             # Admin pages
│   │   └── cms/          # Content management system
│   ├── profile/           # User profile
│   └── content/          # CMS content pages
│       └── [slug]/       # Dynamic content pages
├── components/            # Reusable components
│   └── ui/               # UI components including markdown editor
├── lib/                   # Utilities and configurations
│   ├── supabase/         # Supabase client setup
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions
└── middleware.ts          # Route protection middleware
```

## Development Notes

### Database Policies
Row Level Security (RLS) policies ensure:
- Users can only see their own bookings
- Organizers can only manage their own events
- Admins have full access to all data

### Payment Flow
- Free events are confirmed immediately
- Paid events require Stripe payment completion
- Webhook ensures booking status stays synchronized

### Error Handling
- Form validation on client and server
- Graceful error messages for users
- Comprehensive error logging

## Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Setup
- Update `NEXT_PUBLIC_APP_URL` to your production domain
- Configure Stripe webhook URL for production
- Ensure Supabase project is configured for production

## Testing

To test the complete booking flow:

1. **Setup Test Data**:
   - Create a user account
   - Promote user to organizer role in Supabase
   - Create test events

2. **Test User Flow**:
   - Browse events as anonymous user
   - Sign up/login
   - Book free and paid events
   - Check booking status in dashboard

3. **Test Organizer Flow**:
   - Create events
   - View booking analytics
   - Manage event status

4. **Test Admin/CMS Flow**:
   - Access admin dashboard at `/admin`
   - Navigate to Content Management (`/admin/cms`)
   - Create new content with Markdown
   - View version history
   - Publish content and test dynamic routes (`/content/{slug}`)

## Troubleshooting

If you encounter any issues during setup or usage, please refer to the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) file which covers:

- Database policy recursion errors
- Environment variable issues
- Authentication problems
- Stripe integration issues
- Common development errors

## Additional Documentation

- [CMS System Documentation](CMS_SYSTEM.md) - Complete guide to the Content Management System
- [Quick Fix Guide](QUICK_FIX.md) - Emergency fixes and common solutions
- [Schema Migration Guide](SCHEMA_MIGRATION.md) - Database migration instructions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
