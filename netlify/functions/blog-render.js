const { marked } = require('marked');

const REPO = 'Olarr54/KiqFresh';
const BRANCH = 'main';
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
    ? new Date(date).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
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
  <link rel="icon" type="image/jpeg" href="/logo.jpeg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Bangers&family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/shared.css">
  <style>
    body { background: var(--cream); padding-top: 68px; }

    .post-header {
      padding: 4rem 5% 3rem;
      background: white;
      border-bottom: 3.5px solid var(--black);
      position: relative;
      overflow: hidden;
    }
    .post-header .section-tag { transform: rotate(-1deg); }
    .post-header h1 {
      font-family: 'Bebas Neue', cursive;
      font-size: clamp(3rem, 8vw, 6.5rem);
      line-height: 0.9;
      letter-spacing: 0.04em;
      color: var(--orange);
      text-shadow: 5px 5px 0 var(--black);
      margin: 0.5rem 0 1rem;
      max-width: 800px;
    }
    .post-header .excerpt {
      font-size: 1.1rem;
      font-weight: 700;
      color: #555;
      max-width: 580px;
      line-height: 1.65;
    }
    .post-deco {
      position: absolute;
      right: 4%; top: 50%;
      transform: translateY(-50%);
      font-family: 'Bangers', cursive;
      font-size: clamp(6rem, 14vw, 12rem);
      color: var(--black);
      opacity: 0.04;
      pointer-events: none;
      user-select: none;
      line-height: 1;
    }

    .post-body-wrap {
      max-width: 740px;
      margin: 0 auto;
      padding: 3.5rem 5% 5rem;
    }

    /* Article content */
    .article h1, .article h2, .article h3 {
      font-family: 'Bebas Neue', cursive;
      letter-spacing: 0.04em;
      color: var(--black);
      margin: 2.5rem 0 0.75rem;
      line-height: 1;
    }
    .article h1 { font-size: 2.8rem; }
    .article h2 { font-size: 2.2rem; }
    .article h3 { font-size: 1.6rem; }
    .article p {
      font-size: 1.05rem;
      line-height: 1.85;
      color: #333;
      font-weight: 700;
      margin-bottom: 1.4rem;
    }
    .article ul, .article ol {
      margin: 0 0 1.4rem 1.5rem;
      color: #333;
      font-weight: 700;
    }
    .article li { margin-bottom: 0.5rem; line-height: 1.65; font-size: 1.02rem; }
    .article strong { color: var(--black); }
    .article em { font-style: italic; }
    .article a { color: var(--black); text-decoration: underline; }
    .article a:hover { color: #555; }
    .article hr { border: none; border-top: 3.5px solid var(--black); margin: 2.5rem 0; }
    .article blockquote {
      border-left: 4px solid var(--orange);
      padding: 0.75rem 1.25rem;
      margin: 1.5rem 0;
      color: #555;
      font-style: italic;
      font-weight: 700;
      background: white;
      border-radius: 0 10px 10px 0;
      border-top: 2px solid var(--black);
      border-right: 2px solid var(--black);
      border-bottom: 2px solid var(--black);
    }

    /* CTA box */
    .cta-box {
      margin-top: 3.5rem;
      background: var(--orange);
      border: 3.5px solid var(--black);
      border-radius: 20px;
      box-shadow: 6px 6px 0 var(--black);
      padding: 2rem 2rem 2rem;
      text-align: center;
    }
    .cta-box h3 {
      font-family: 'Bebas Neue', cursive;
      font-size: 2.2rem;
      letter-spacing: 0.04em;
      color: var(--black);
      margin-bottom: 0.5rem;
    }
    .cta-box p {
      font-weight: 700;
      color: rgba(0,0,0,0.6);
      margin-bottom: 1.5rem;
      font-size: 1rem;
    }
    .cta-box a {
      display: inline-block;
      font-family: 'Bangers', cursive;
      font-size: 1.15rem;
      letter-spacing: 0.1em;
      padding: 0.85rem 2.2rem;
      border-radius: 100px;
      border: 3.5px solid var(--black);
      background: var(--black);
      color: white;
      text-decoration: none;
      box-shadow: 4px 4px 0 rgba(0,0,0,0.25);
      transition: transform 0.12s, box-shadow 0.12s;
    }
    .cta-box a:hover {
      transform: translate(-3px, -3px);
      box-shadow: 6px 6px 0 rgba(0,0,0,0.25);
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-family: 'Bangers', cursive;
      font-size: 0.95rem;
      letter-spacing: 0.1em;
      color: #888;
      text-decoration: none;
      margin-bottom: 2.5rem;
    }
    .back-link:hover { color: var(--black); }

    footer {
      background: var(--black);
      color: rgba(255,255,255,0.35);
      text-align: center;
      padding: 2rem 5%;
      font-size: 0.82rem;
      font-weight: 700;
    }
    footer a { color: var(--orange); text-decoration: none; }
  </style>
</head>
<body>

<nav id="main-nav">
  <a href="/" class="nav-logo">
    <img src="/logo.jpeg" class="nav-logo-img" alt="KiqFresh logo">
  </a>
  <ul class="nav-links">
    <li><a href="/">Home</a></li>
    <li><a href="/#services">Services</a></li>
    <li><a href="/blog/" class="active">Blog</a></li>
    <li><a href="/booking.html" class="nav-cta">Book Now</a></li>
  </ul>
  <button class="nav-burger" id="burger" aria-label="Open menu">
    <span></span><span></span><span></span>
  </button>
</nav>

<div class="post-header">
  <div class="section-tag">${dateStr ? dateStr + ' &middot; ' : ''}KiqFresh Blog</div>
  <h1>${esc(title)}</h1>
  ${excerpt ? `<p class="excerpt">${esc(excerpt)}</p>` : ''}
  <div class="post-deco">BLOG</div>
</div>

<div class="post-body-wrap">
  <a href="/blog/" class="back-link">&larr; All Posts</a>
  <div class="article">${html}</div>
  <div class="cta-box">
    <h3>Ready for Fresh Kicks?</h3>
    <p>Professional shoe cleaning from £15 &mdash; Reading collection or UK postal.</p>
    <a href="/booking.html">Book a Clean</a>
  </div>
</div>

<footer>
  <a href="/">kiqfresh.net</a> &nbsp;&middot;&nbsp; Professional Shoe Cleaning, Reading UK
</footer>

<script>
  document.getElementById('burger').addEventListener('click', function() {
    document.querySelector('.nav-links').classList.toggle('open');
  });

  var lastY = 0;
  var nav = document.getElementById('main-nav');
  window.addEventListener('scroll', function() {
    var y = window.scrollY;
    if (y > lastY && y > 120) nav.classList.add('nav-hidden');
    else nav.classList.remove('nav-hidden');
    lastY = y;
  }, { passive: true });
</script>
</body>
</html>`;
}

exports.handler = async (event) => {
  const slug = event.queryStringParameters?.slug;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return { statusCode: 400, body: 'Invalid slug' };
  }

  const rawRes = await fetch(
    `https://raw.githubusercontent.com/${REPO}/${BRANCH}/blog/posts/${slug}.md`
  );

  if (!rawRes.ok) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/html' },
      body: `<!DOCTYPE html><html><head><title>Not Found — KiqFresh</title><link rel="stylesheet" href="/shared.css"></head><body style="padding-top:68px;background:var(--cream);display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Nunito,sans-serif;flex-direction:column;gap:1rem;text-align:center"><h1 style="font-family:'Bebas Neue',cursive;font-size:4rem;color:#A5D2FF;text-shadow:4px 4px 0 #111">Post Not Found</h1><a href="/blog/" style="font-family:Bangers,cursive;letter-spacing:.1em;color:#111;border:3px solid #111;padding:.5rem 1.5rem;border-radius:100px;text-decoration:none;box-shadow:3px 3px 0 #111">Back to Blog</a></body></html>`,
    };
  }

  const content = await rawRes.text();
  const { data, body } = parseFrontmatter(content);
  const htmlContent = marked(body);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    body: buildPage(data.title || slug, data.excerpt || '', data.date || '', htmlContent, slug),
  };
};
