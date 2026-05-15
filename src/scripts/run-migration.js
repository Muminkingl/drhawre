const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
  ALTER TABLE public.patients DROP COLUMN IF EXISTS image_url;
  ALTER TABLE public.patients DROP COLUMN IF EXISTS imaging;
  ALTER TABLE public.patients DROP COLUMN IF EXISTS ultrasound;
  ALTER TABLE public.patients DROP COLUMN IF EXISTS report;
  ALTER TABLE public.patients DROP COLUMN IF EXISTS lab_text;
  ALTER TABLE public.patients DROP COLUMN IF EXISTS response;
  
  ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS history TEXT DEFAULT '';
  ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS past_medical_history TEXT DEFAULT '';
  ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS drug_history TEXT DEFAULT '';
  ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS past_surgical_history TEXT DEFAULT '';
  
  NOTIFY pgrst, 'reload schema';
`;

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Schema updated successfully');
  }
}

run();
