// link_type -> block editor component. To add a block type: create a
// <Type>Block.tsx in this folder and register it here.
import React from 'react';
import type { BlockEditorProps } from './types';
import HeaderBlock from './HeaderBlock';
import TextBlock from './TextBlock';
import HeadingBlock from './HeadingBlock';
import SpaceBlock from './SpaceBlock';
import UrlBlock from './UrlBlock';
import ProductBlock from './ProductBlock';
import VideoBlock from './VideoBlock';
import LeadFormBlock from './LeadFormBlock';
import ImageBlock from './ImageBlock';
import HtmlEmbedBlock from './HtmlEmbedBlock';
import SpotifyBlock from './SpotifyBlock';
import SocialIconsBlock from './SocialIconsBlock';
import BannerBlock from './BannerBlock';

export const BLOCK_EDITORS: Record<string, React.ComponentType<BlockEditorProps>> = {
  header: HeaderBlock,
  text: TextBlock,
  heading: HeadingBlock,
  space: SpaceBlock,
  url: UrlBlock,
  product: ProductBlock,
  video_embed: VideoBlock,
  lead_form: LeadFormBlock,
  image: ImageBlock,
  html_embed: HtmlEmbedBlock,
  spotify: SpotifyBlock,
  social_icons: SocialIconsBlock,
  banner: BannerBlock,
};

export function BlockBody(props: BlockEditorProps) {
  const Editor = BLOCK_EDITORS[props.link.link_type];
  return Editor ? <Editor {...props} /> : null;
}
