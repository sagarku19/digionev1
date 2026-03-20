import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Lock, ArrowLeft, Clock } from 'lucide-react';

export const revalidate = 60;

function readingTime(content: string) {
  const words = content?.replace(/<[^>]+>/g, '').split(/\s+/).length ?? 0;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string; childslug: string; postSlug: string }>;
}) {
  const { slug, childslug, postSlug } = await params;
  const supabase = await createClient();

  // Resolve the blog child site
  const { data: parent } = await supabase.from('sites').select('id').eq('slug', slug).eq('site_type', 'main').single();
  const { data: childSite } = await (parent
    ? supabase.from('sites').select('id').eq('parent_site_id', parent.id).eq('child_slug', childslug).single()
    : supabase.from('sites').select('id').eq('slug', childslug).eq('site_type', 'blog').single()
  );

  if (!childSite) notFound();

  // Load post
  const { data: post } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content, description, thumbnail_url, tags, published_at, is_free, product_id')
    .eq('site_id', childSite.id)
    .eq('slug', postSlug)
    .eq('is_published', true)
    .maybeSingle();

  if (!post) notFound();

  // Gate check — if not free, check user_product_access
  let hasAccess = post.is_free;
  if (!hasAccess && post.product_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: access } = await supabase
        .from('user_product_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', post.product_id)
        .maybeSingle();
      hasAccess = !!access;
    }
  }

  // Related posts
  const { data: related } = await supabase
    .from('blog_posts')
    .select('id, title, slug, thumbnail_url, published_at')
    .eq('site_id', childSite.id)
    .eq('is_published', true)
    .neq('id', post.id)
    .limit(3);

  const mins = readingTime(post.content ?? '');
  const basePath = `/${slug}/${childslug}`;

  // For gated posts: show first 200 words then blur
  const gatedPreview = !hasAccess && post.content
    ? post.content.replace(/<[^>]+>/g, ' ').split(/\s+/).slice(0, 200).join(' ') + '…'
    : null;

  return (
    <div className="min-h-screen bg-[--creator-bg]">
      {/* Hero */}
      {post.thumbnail_url && (
        <div className="w-full h-64 md:h-96 relative overflow-hidden">
          <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[--creator-bg] to-transparent" />
        </div>
      )}

      <div className="max-w-[680px] mx-auto px-4 pb-24">
        {/* Back */}
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-sm text-[--creator-text-muted] hover:text-[--creator-primary] mt-8 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to blog
        </Link>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {(post.tags ?? []).map((tag: string) => (
            <span key={tag} className="text-xs font-medium text-[--creator-primary] bg-[--creator-primary]/10 px-2.5 py-1 rounded-full">{tag}</span>
          ))}
          {!post.is_free && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/15 px-2.5 py-1 rounded-full">
              <Lock className="w-3 h-3" /> Members only
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-[--creator-text] leading-tight mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 text-xs text-[--creator-text-muted] mb-10 pb-6 border-b border-gray-200 dark:border-gray-700">
          <span>{post.published_at ? formatDate(post.published_at) : ''}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {mins} min read</span>
        </div>

        {/* Content */}
        {hasAccess ? (
          <div
            className="prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content ?? '' }}
          />
        ) : (
          <>
            {/* Free preview */}
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p>{gatedPreview}</p>
            </div>

            {/* Blur + gate overlay */}
            <div className="relative mt-6">
              <div className="h-32 bg-gradient-to-b from-transparent via-white/80 dark:via-[#060612]/80 to-white dark:to-[#060612] pointer-events-none" />
              <div className="text-center py-10 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl px-6 shadow-xl">
                <Lock className="w-8 h-8 text-[--creator-primary] mx-auto mb-3" />
                <h3 className="text-xl font-bold text-[--creator-text] mb-2">This is a members-only post</h3>
                <p className="text-sm text-[--creator-text-muted] mb-6">Purchase the product to unlock the full article.</p>
                {post.product_id && (
                  <a
                    href={`/api/checkout?productId=${post.product_id}`}
                    className="inline-flex items-center gap-2 bg-[--creator-primary] text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg hover:opacity-90 transition-all"
                  >
                    Unlock full article →
                  </a>
                )}
              </div>
            </div>
          </>
        )}

        {/* Related posts */}
        {hasAccess && (related ?? []).length > 0 && (
          <div className="mt-16 pt-10 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-[--creator-text] mb-6">Continue reading</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(related ?? []).map((r: any) => (
                <Link key={r.id} href={`${basePath}/${r.slug}`} className="group block bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-md transition-all">
                  {r.thumbnail_url && (
                    <img src={r.thumbnail_url} alt={r.title} className="w-full h-28 object-cover" />
                  )}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-[--creator-text] group-hover:text-[--creator-primary] line-clamp-2 transition-colors">{r.title}</p>
                    <p className="text-xs text-[--creator-text-muted] mt-1">{formatDate(r.published_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
