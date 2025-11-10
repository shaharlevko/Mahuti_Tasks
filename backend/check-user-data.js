const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserData() {
  try {
    // Get your user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'shaharlevko@gmail.com')
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return;
    }

    console.log('\n=== User Data ===');
    console.log(JSON.stringify(user, null, 2));
    console.log('\n=== Profile Picture URL ===');
    console.log('Value:', user.profile_picture_url);
    console.log('Type:', typeof user.profile_picture_url);
    console.log('Is null:', user.profile_picture_url === null);
    console.log('Is undefined:', user.profile_picture_url === undefined);

    // Check table structure
    const { data: columns } = await supabase
      .from('users')
      .select('*')
      .limit(0);

    console.log('\n=== Available Columns ===');
    console.log('This query returned these fields:');
    if (user) {
      console.log(Object.keys(user).join(', '));
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkUserData();
