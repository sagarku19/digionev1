import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductSalesPage from '@/components/storefront/ProductSalesPage';
import PaymentLinkPage  from '@/components/storefront/PaymentLinkPage';
import BlogIndexPage    from '@/components/storefront/BlogIndexPage';

export const revalidate = 60;

export default async function ChildSlugPage({
  params,
}: {
  params: Promise<{ slug: string; childslug: string }>;
}) {
  const { slug, childslug } = await params;
  const supabase = await createClient();

  // Resolve parent main site
  const { data: parent } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', slug)
    .eq('site_type', 'main')
    .single();

  // Also support top-level single/payment/blog sites (no parent)
  const { data: childSite } = await (parent
    ? supabase.from('sites').select('*').eq('parent_site_id', parent.id).eq('child_slug', childslug).eq('is_active', true).single()
    : supabase.from('sites').select('*').eq('slug', childslug).eq('is_active', true).single()
  );

  if (!childSite) notFound();

  switch (childSite.site_type) {
    case 'single': {
      const { data: sp } = await supabase
        .from('site_singlepage')
        .select('*, products(*)')
        .eq('site_id', childSite.id)
        .single();
      return <ProductSalesPage siteId={childSite.id} singlePage={sp} />;
    }
    case 'payment': {
      const { data: sm } = await supabase
        .from('site_main')
        .select('title, meta_description')
        .eq('site_id', childSite.id)
        .single();
      return <PaymentLinkPage siteId={childSite.id} siteMain={sm} />;
    }
    case 'blog': {
      const { data: blog } = await supabase
        .from('site_blog')
        .select('*')
        .eq('site_id', childSite.id)
        .single();
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, tags, published_at, is_free')
        .eq('site_id', childSite.id)
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      return <BlogIndexPage blog={blog} posts={posts ?? []} parentSlug={slug} childSlug={childslug} />;
    }
    default:
      notFound();
  }
}
