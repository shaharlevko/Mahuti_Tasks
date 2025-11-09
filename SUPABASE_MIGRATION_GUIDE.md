# Supabase Migration Guide

This guide will help you migrate your Mahuti Tasks application from SQLite to Supabase (PostgreSQL).

## Step 1: Run the SQL Migration in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com/project/whsxeiwljdqhqvydyfxe
2. Click on the **SQL Editor** in the left sidebar
3. Create a new query
4. Copy the entire contents of `backend/supabase-migration.sql`
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

This will create all the necessary tables, indexes, and initial data.

## Step 2: Get Your Supabase Credentials

1. In your Supabase Dashboard, go to **Settings** > **API**
2. You'll find:
   - **Project URL**: This is your `SUPABASE_URL`
   - **Project API keys**:
     - `anon` `public`: This is your `SUPABASE_ANON_KEY`
     - `service_role` `secret`: This is your `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Create Environment File

1. Copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Supabase credentials:
   ```
   SUPABASE_URL=https://whsxeiwljdqhqvydyfxe.supabase.co
   SUPABASE_ANON_KEY=your_actual_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
   ```

## Step 4: Important Notes

### Admin User Password

The migration creates a default admin user with:
- **Email**: admin@mahuti.com
- **Password**: admin123

⚠️ **IMPORTANT**: The password hash in the migration file is a placeholder. After running the migration, you'll need to:

1. Either update the password hash in Supabase manually, OR
2. Use the registration endpoint to create a new admin user, OR
3. Let me know and I'll help you generate the correct hash

To generate a correct bcrypt hash for "admin123":
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin123', 10);
console.log(hash);
```

Then update the users table in Supabase:
```sql
UPDATE users
SET password_hash = '$2a$10$YOUR_GENERATED_HASH_HERE'
WHERE email = 'admin@mahuti.com';
```

### Row Level Security (RLS)

The migration includes RLS policies. These are currently set up for Supabase Auth.

Since we're using custom JWT authentication, you have two options:

1. **Disable RLS** (simpler, less secure):
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
   ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
   ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;
   ALTER TABLE schedule_assignments DISABLE ROW LEVEL SECURITY;
   ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
   ```

2. **Keep RLS and integrate Supabase Auth** (more secure, requires more work)

For now, I recommend **option 1** to get up and running quickly.

## Step 5: Testing the Migration

Once you've completed steps 1-3, the backend will automatically use Supabase when you restart it:

```bash
cd backend
node src/server.js
```

You should see:
```
✓ Successfully connected to Supabase
Mahuti Tasks API running on http://localhost:3001
```

## Next Steps

After the migration is complete, I'll need to update the backend code to use Supabase queries instead of SQLite queries. Let me know when you've completed these steps and I'll proceed with the code updates!

## Rollback Plan

If you need to rollback to SQLite:
1. The original SQLite database (`mahuti_tasks.db`) is preserved
2. Simply remove or rename the `.env` file
3. The application will fall back to SQLite

## Questions?

Let me know if you encounter any issues during the migration!
