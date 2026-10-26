/**
 * Submit deployed sitemap URLs to IndexNow by hand after a deploy.
 * Google does not support IndexNow; Bing, Yandex and other search engines do.
 */
const SITE_URL = (process.env.SITE_URL || 'https://www.thenerdstudio.space').replace(/\/+$/, '');
const key = '7f3a9c1e5b2d4468a0c1e9d2b6f84a53';
const keyLocation = `${SITE_URL}/${key}.txt`;

const keyResponse = await fetch(keyLocation);
if (keyResponse.status !== 200 || (await keyResponse.text()) !== key) {
  console.error(`IndexNow key verification failed: ${keyLocation} must return HTTP 200 and the exact key.`);
  process.exit(1);
}

const sitemapResponse = await fetch(`${SITE_URL}/sitemap.xml`);
if (!sitemapResponse.ok) throw new Error(`Could not fetch sitemap: HTTP ${sitemapResponse.status}`);
const sitemap = await sitemapResponse.text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => match[1])
  .filter((url) => !/^\/(?:booth|p)(?:\/|$)/.test(new URL(url).pathname));

if (process.argv.includes('--dry-run')) {
  console.log(`IndexNow dry run: ${urlList.length} URLs; key location ${keyLocation}`);
} else {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE_URL).host, key, keyLocation, urlList }),
  });
  console.log(`IndexNow POST HTTP ${response.status}${[200, 202].includes(response.status) ? ' (accepted)' : ''}`);
  if (![200, 202].includes(response.status)) process.exitCode = 1;
}
