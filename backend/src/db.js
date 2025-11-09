require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test connection and ensure admin user exists
const initializeDatabase = async () => {
  try {
    // Test connection
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
      console.error('❌ Supabase connection error:', error.message);
      return;
    }

    console.log('✓ Successfully connected to Supabase');

    // Ensure admin user exists
    await ensureAdminUser();

  } catch (err) {
    console.error('❌ Supabase initialization failed:', err.message);
  }
};

// Ensure default admin user exists
const ensureAdminUser = async () => {
  try {
    const defaultPassword = bcrypt.hashSync('admin123', 10);

    const { error } = await supabase
      .from('users')
      .upsert({
        email: 'admin@mahuti.com',
        password_hash: defaultPassword,
        name: 'Admin User',
        role: 'admin'
      }, {
        onConflict: 'email',
        ignoreDuplicates: true
      });

    if (error && error.code !== '23505') { // Ignore unique constraint violation
      console.error('Error ensuring admin user:', error.message);
    } else {
      console.log('✓ Default admin user ensured: admin@mahuti.com / admin123');
    }
  } catch (err) {
    console.error('Error in ensureAdminUser:', err.message);
  }
};

// Initialize on module load
initializeDatabase();

module.exports = supabase;
