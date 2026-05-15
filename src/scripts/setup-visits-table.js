const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hvcwikfcpyuplohlsoua.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY; // This needs to be the service_role key, not the anon key

if (!supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey);

// Path to SQL file
const sqlFilePath = path.join(__dirname, '../lib/create-visits-table.sql');

// Read SQL file content
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function setupVisitsTable() {
  try {
    console.log('Creating visits table if it does not exist...');
    
    // Execute SQL to create the visits table
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error creating visits table:', error);
      process.exit(1);
    }
    
    console.log('Successfully created visits table');
    
    // Verify that the table was created
    const { data, error: verifyError } = await supabase
      .from('visits')
      .select('id')
      .limit(1);
      
    if (verifyError) {
      console.error('Error verifying visits table creation:', verifyError);
      process.exit(1);
    }
    
    console.log('Visits table verified successfully');
    
    // Count existing patients
    const { data: patientsData, error: patientsError } = await supabase
      .from('patients')
      .select('id');
      
    if (patientsError) {
      console.error('Error counting patients:', patientsError);
    } else {
      console.log(`Found ${patientsData.length} existing patients`);
      
      // Create initial visit records for existing patients if needed
      if (patientsData.length > 0) {
        const visits = patientsData.map(patient => ({
          patient_id: patient.id
        }));
        
        const { data: visitInsertData, error: visitInsertError } = await supabase
          .from('visits')
          .insert(visits)
          .select();
          
        if (visitInsertError) {
          console.error('Error creating initial visit records:', visitInsertError);
        } else {
          console.log(`Created ${visitInsertData.length} initial visit records for existing patients`);
        }
      }
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

setupVisitsTable();
