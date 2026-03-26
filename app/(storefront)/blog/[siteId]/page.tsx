// Route: /blog/{siteId} — Blog index page
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BlogIndexPage from '@/components/storefront/BlogIndexPage';

export const revalidate = 60;

export default async function BlogPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from('sites')
    .select('id, site_type, is_active')
    .eq('id', siteId)
    .eq('site_type', 'blog')
    .eq('is_active', true)
    .maybeSingle();

  if (!site) notFound();

  const { data: blog } = await supabase
    .from('site_blog')
    .select('*')
    .eq('site_id', site.id)
    .single();

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, description, thumbnail_url, tags, published_at, is_free')
    .eq('site_id', site.id)
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  return <BlogIndexPage blog={blog} posts={posts ?? []} basePath={`/blog/${siteId}`} />;
}
