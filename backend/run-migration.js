const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create_invitations_table.sql'),
      'utf8'
    );

    console.log('Running migration on Supabase...');

    // Execute the SQL migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, we'll need to run it differently
      // Try using the REST API directly
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ sql: migrationSQL })
      });

      if (!response.ok) {
        throw new Error('Migration failed. You may need to run this SQL manually in the Supabase dashboard.');
      }

      console.log('✅ Migration completed successfully!');
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('Result:', data);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📝 Please run this SQL manually in your Supabase dashboard:');
    console.log('https://app.supabase.com/project/YOUR_PROJECT/editor');
    console.log('\nSQL to run:');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create_invitations_table.sql'),
      'utf8'
    );
    console.log('\n' + migrationSQL);
  }
}

runMigration();
