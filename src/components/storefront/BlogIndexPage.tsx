// BlogIndexPage — blog landing page with featured post, tag filter, post grid.
// DB tables: site_blog, blog_posts (read via props)

import React from 'react';
import Link from 'next/link';
import { Lock, Tag } from 'lucide-react';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PostCard({ post, href }: { post: any; href: string }) {
  return (
    <Link href={href} className="group block bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-xl hover:border-[--creator-primary]/30 transition-all">
      {post.thumbnail_url && (
        <img src={post.thumbnail_url} alt={post.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          {!post.is_free && <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/15 px-2 py-0.5 rounded-full"><Lock className="w-3 h-3" /> Members only</span>}
          {(post.tags ?? []).slice(0, 2).map((tag: string) => (
            <span key={tag} className="text-xs text-[--creator-text-muted] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
        <h3 className="font-bold text-[--creator-text] group-hover:text-[--creator-primary] transition-colors line-clamp-2">{post.title}</h3>
        {post.description && <p className="text-sm text-[--creator-text-muted] mt-2 line-clamp-2">{post.description}</p>}
        <p className="text-xs text-[--creator-text-muted] mt-3">{formatDate(post.published_at)}</p>
      </div>
    </Link>
  );
}

export default function BlogIndexPage({ blog, posts, basePath }: {
  blog: any; posts: any[]; basePath: string;
}) {
  const allTags = Array.from(new Set(posts.flatMap((p: any) => p.tags ?? [])));

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="py-20 px-4 bg-gradient-to-b from-[--creator-primary]/5 to-transparent text-center">
        <h1 className="text-4xl font-extrabold text-[--creator-text]">{blog?.title ?? 'Blog'}</h1>
        {blog?.description && <p className="text-[--creator-text-muted] mt-3 max-w-xl mx-auto">{blog.description}</p>}
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-8">
            <Tag className="w-4 h-4 text-[--creator-text-muted]" />
            {allTags.map((tag: string) => (
              <span key={tag} className="text-sm text-[--creator-text-muted] border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full hover:border-[--creator-primary] hover:text-[--creator-primary] cursor-pointer transition">{tag}</span>
            ))}
          </div>
        )}

        {/* Featured post */}
        {posts[0] && (
          <Link href={`${basePath}/${posts[0].slug}`} className="group block mb-10 bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden md:flex hover:shadow-xl transition-all">
            {posts[0].thumbnail_url && (
              <img src={posts[0].thumbnail_url} alt={posts[0].title} className="w-full md:w-2/5 h-56 md:h-auto object-cover" />
            )}
            <div className="p-7 flex flex-col justify-center">
              <span className="text-xs font-bold text-[--creator-primary] uppercase tracking-widest mb-2">Featured</span>
              <h2 className="text-2xl font-extrabold text-[--creator-text] group-hover:text-[--creator-primary] transition-colors">{posts[0].title}</h2>
              {posts[0].description && <p className="text-[--creator-text-muted] mt-2 line-clamp-3">{posts[0].description}</p>}
              <p className="text-xs text-[--creator-text-muted] mt-4">{formatDate(posts[0].published_at)}</p>
            </div>
          </Link>
        )}

        {/* Post grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.slice(1).map((post: any) => (
            <PostCard key={post.id} post={post} href={`${basePath}/${post.slug}`} />
          ))}
        </div>

        {posts.length === 0 && (
          <p className="text-center text-[--creator-text-muted] py-16">No posts published yet. Check back soon!</p>
        )}
      </div>
    </div>
  );
}
