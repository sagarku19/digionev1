import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function run() {
  // Try inserting a row with parent_site_id = null and child_slug = 'test'
  // Profile id: aaf5b9d8-9127-4040-b492-e4238a07cf83 (from user error log)
  const creatorId = 'aaf5b9d8-9127-4040-b492-e4238a07cf83';
  
  console.log('Test 1: parent_site_id = null, child_slug = "test", slug = null');
  let res = await supabase.from('sites').insert({
    creator_id: creatorId,
    site_type: 'payment',
    slug: null,
    child_slug: 'test',
    parent_site_id: null
  });
  console.log(res.error?.message || 'Success 1');

  console.log('Test 2: parent_site_id = null, child_slug = "test", slug = "testslug"');
  res = await supabase.from('sites').insert({
    creator_id: creatorId,
    site_type: 'payment',
    slug: 'testslug',
    child_slug: 'test',
    parent_site_id: null
  });
  console.log(res.error?.message || 'Success 2');
  
  console.log('Test 3: parent_site_id = null, child_slug = null, slug = "testslug2"');
  res = await supabase.from('sites').insert({
    creator_id: creatorId,
    site_type: 'payment',
    slug: 'testslug2',
    child_slug: null,
    parent_site_id: null
  });
  console.log(res.error?.message || 'Success 3');
}

run();
