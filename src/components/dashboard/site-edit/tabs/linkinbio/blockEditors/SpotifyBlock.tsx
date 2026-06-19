import React from 'react';
import { FieldLabel, INPUT, Chip } from './_shared';
import type { BlockEditorProps } from './types';

export default function SpotifyBlock({ link, updateMeta }: BlockEditorProps) {
  return (
    <>
      <div>
        <FieldLabel>Spotify URL</FieldLabel>
        <input type="url" value={link.metadata?.spotify_url || ''}
          onChange={e => updateMeta('spotify_url', e.target.value)}
          className={INPUT} placeholder="https://open.spotify.com/track/..." />
        <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">Paste a Spotify track, album, playlist, or artist URL</p>
      </div>
      <div>
        <FieldLabel>Type</FieldLabel>
        <div className="flex gap-1.5">
          {['track', 'album', 'playlist', 'artist'].map(t => (
            <Chip key={t} active={(link.metadata?.embed_type || 'track') === t}
              onClick={() => updateMeta('embed_type', t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Chip>
          ))}
        </div>
      </div>
    </>
  );
}
