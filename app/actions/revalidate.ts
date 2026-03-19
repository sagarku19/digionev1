'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Executes a Next.js App Router cache revalidation from the server
 * so storefront updates propagate instantly worldwide without waiting for ISR intervals.
 */
export async function revalidateStorefrontPaths(paths: string[]) {
  try {
    for (const p of paths) {
      revalidatePath(p, 'page');
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to revalidate cache:', err);
    return { success: false, error: err };
  }
}
