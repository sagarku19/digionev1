import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function run() {
  const { data, error } = await supabase.rpc('get_constraint_definition', {
    constraint_name: 'chk_sites_parent_slug_consistency'
  });
  
  // If no RPC exists, we can use the postgres metadata API if exposed, 
  // but it's usually not. Let's try querying the graphql endpoint 
  // or a simple REST query if available.
  
  if (error) {
    console.error('RPC Error:', error.message);
  } else {
    console.log('Result:', data);
  }
}

run();
