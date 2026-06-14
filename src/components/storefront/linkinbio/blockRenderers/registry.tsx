// link_type -> block renderer. Mirrors blockEditors/registry.tsx.
import React from 'react';
import type { BlockRendererProps, BioLink, BioData, ProductLite } from './_shared';
import { getAnimationStyle, getCardStyle } from './_shared';
import HeaderBlock from './HeaderBlock';
import TextBlock from './TextBlock';
import HeadingBlock from './HeadingBlock';
import DividerBlock from './DividerBlock';
import SpaceBlock from './SpaceBlock';
import SocialIconsBlock from './SocialIconsBlock';
import HtmlEmbedBlock from './HtmlEmbedBlock';
import SpotifyBlock from './SpotifyBlock';
import BannerBlock from './BannerBlock';
import ImageBlock from './ImageBlock';
import VideoBlock from './VideoBlock';
import LeadFormBlock from './LeadFormBlock';
import ProductBlock from './ProductBlock';
import UrlBlock from './UrlBlock';

export const BLOCK_RENDERERS: Record<string, React.ComponentType<BlockRendererProps>> = {
  header: HeaderBlock,
  text: TextBlock,
  heading: HeadingBlock,
  divider: DividerBlock,
  space: SpaceBlock,
  social_icons: SocialIconsBlock,
  html_embed: HtmlEmbedBlock,
  spotify: SpotifyBlock,
  banner: BannerBlock,
  image: ImageBlock,
  video_embed: VideoBlock,
  lead_form: LeadFormBlock,
  email_capture: LeadFormBlock, // legacy alias
  product: ProductBlock,
  url: UrlBlock,
};

export function BlockRenderer({
  link, bio, palette, productsMap, siteId, index,
}: {
  link: BioLink;
  bio: BioData;
  palette: Record<string, string>;
  productsMap: Record<string, ProductLite>;
  siteId: string;
  index: number;
}) {
  const animStyle = getAnimationStyle(bio.animation, index);
  const cardSt = getCardStyle(bio.card_style, palette);
  const Comp = BLOCK_RENDERERS[link.link_type] ?? (link.url ? UrlBlock : null);
  if (!Comp) return null;
  return <Comp link={link} bio={bio} palette={palette} productsMap={productsMap} siteId={siteId} index={index} animStyle={animStyle} cardSt={cardSt} />;
}
