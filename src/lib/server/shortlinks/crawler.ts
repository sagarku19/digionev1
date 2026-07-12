// Detects social / link-preview crawlers that should get an OG meta shell
// instead of a 302, so shared links render a rich preview.

export function isSocialCrawler(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|slack-imgproxy|discordbot|whatsapp|telegrambot|pinterest|redditbot|skypeuripreview|vkshare|embedly|quora link preview|outbrain|bitlybot|nuzzel|bufferbot|flipboard|applebot|googlebot/i.test(ua);
}
