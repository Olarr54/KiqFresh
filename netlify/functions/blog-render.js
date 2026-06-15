const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const SITE_URL = 'https://kiqfresh.net';

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const data = {};
  match[1].split('\n').forEach(line => {
    const i = line.indexOf(':');
    if (i > 0) {
      const key = line.slice(0, i).trim();
      let val = line.slice(i + 1).trim();
      if (/^["'].*["']$/.test(val)) val = val.slice(1, -1);
      data[key] = val;
    }
  });
  return { data, body: match[2] };
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildPage(title, excerpt, date, html, slug) {
  const dateStr = date
    ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — KiqFresh Blog</title>
  <meta name="description" content="${esc(excerpt)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(excerpt)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${SITE_URL}/blog/${esc(slug)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root { --blue:#A5D2FF; --black:#111; --cream:#F7F4EF; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Nunito',system-ui,sans-serif; background:var(--black); color:var(--cream); }
    header { display:flex; align-items:center; justify-content:space-between; padding:1rem 2rem; border-bottom:1px solid #1e1e1e; }
    .brand { font-family:'Bebas Neue',sans-serif; font-size:2rem; letter-spacing:0.06em; color:var(--blue); text-decoration:none; }
    nav a { color:#777; text-decoration:none; font-size:0.88rem; margin-left:1.5rem; font-weight:600; }
    nav a:hover { color:var(--cream); }
    main { max-width:720px; margin:0 auto; padding:3rem 1.5rem 5rem; }
    .meta { font-size:0.75rem; color:#555; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:1rem; }
    h1.post-title { font-family:'Bebas Neue',sans-serif; font-size:3.2rem; letter-spacing:0.02em; line-height:1.05; margin-bottom:1.25rem; }
    .excerpt { font-size:1.05rem; color:#999; line-height:1.7; margin-bottom:2.5rem; padding-bottom:2rem; border-bottom:1px solid #1e1e1e; }
    .body h1,.body h2,.body h3 { font-family:'Bebas Neue',sans-serif; letter-spacing:0.03em; color:var(--cream); margin:2rem 0 0.75rem; }
    .body h1 { font-size:2.2rem; }
    .body h2 { font-size:1.8rem; }
    .body h3 { font-size:1.3rem; }
    .body p { font-size:1rem; line-height:1.85; color:#bbb; margin-bottom:1.25rem; }
    .body ul,.body ol { margin:0 0 1.25rem 1.5rem; color:#bbb; line-height:1.8; }
    .body li { margin-bottom:0.4rem; }
    .body strong { color:var(--cream); }
    .body a { color:var(--blue); text-decoration:none; }
    .body a:hover { text-decoration:underline; }
    .body hr { border:none; border-top:1px solid #1e1e1e; margin:2rem 0; }
    .body blockquote { border-left:3px solid var(--blue); padding:0.5rem 1rem; margin:1.5rem 0; color:#999; font-style:italic; }
    .cta { margin-top:3.5rem; padding:2rem; background:#1a1a1a; border:1px solid #2a2a2a; border-left:3px solid var(--blue); border-radius:8px; }
    .cta p { color:#aaa; margin-bottom:1.25rem; line-height:1.6; }
    .cta a { display:inline-block; background:var(--blue); color:#111; padding:0.7rem 1.5rem; border-radius:6px; font-weight:800; text-decoration:none; font-size:0.95rem; }
    footer { text-align:center; padding:2rem; color:#444; font-size:0.78rem; border-top:1px solid #1a1a1a; margin-top:2rem; }
    footer a { color:var(--blue); text-decoration:none; }
    @media(max-width:600px) { h1.post-title { font-size:2.2rem; } header { padding:1rem; } main { padding:2rem 1rem 4rem; } }
  </style>
</head>
<body>
<header>
  <a href="/" class="brand">KiqFresh</a>
  <nav>
    <a href="/blog/">Blog</a>
    <a href="/booking.html">Book Now</a>
  </nav>
</header>
<main>
  <div class="meta">${dateStr ? `${dateStr} &middot; ` : ''}KiqFresh Blog</div>
  <h1 class="post-title">${esc(title)}</h1>
  ${excerpt ? `<p class="excerpt">${esc(excerpt)}</p>` : ''}
  <div class="body">${html}</div>
  <div class="cta">
    <p>Want your trainers looking this fresh? KiqFresh offers professional shoe cleaning in Reading — starting from just £15.</p>
    <a href="/booking.html">Book a Clean</a>
  </div>
</main>
<footer>
  <a href="/">kiqfresh.net</a> &middot; Professional Shoe Cleaning, Reading UK
</footer>
</body>
</html>`;
}

exports.handler = async (event) => {
  const slug = event.queryStringParameters?.slug;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return { statusCode: 400, body: 'Invalid slug' };
  }

  const filePath = path.join(__dirname, '..', '..', 'blog', 'posts', `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/html' },
      body: `<!DOCTYPE html><html><head><title>Not Found — KiqFresh</title></head><body style="background:#111;color:#F7F4EF;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:1rem"><h1>Post not found</h1><a href="/blog/" style="color:#A5D2FF">Back to blog</a></body></html>`,
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, body } = parseFrontmatter(content);
  const htmlContent = marked(body);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: buildPage(data.title || slug, data.excerpt || '', data.date || '', htmlContent, slug),
  };
};
