const REPO = 'Olarr54/KiqFresh';
const BRANCH = 'main';

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
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
  return data;
}

exports.handler = async () => {
  try {
    const listRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/blog/posts?ref=${BRANCH}`,
      { headers: { 'User-Agent': 'KiqFresh' } }
    );

    if (!listRes.ok) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
    }

    const files = await listRes.json();
    const mdFiles = files.filter(f => f.name.endsWith('.md'));

    const posts = await Promise.all(mdFiles.map(async file => {
      const raw = await fetch(
        `https://raw.githubusercontent.com/${REPO}/${BRANCH}/blog/posts/${file.name}`
      );
      const content = await raw.text();
      const data = parseFrontmatter(content);
      return {
        slug: file.name.replace('.md', ''),
        title: data.title || file.name.replace('.md', ''),
        date: data.date || '',
        excerpt: data.excerpt || '',
      };
    }));

    posts.sort((a, b) => (b.date > a.date ? 1 : -1));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify(posts),
    };
  } catch (err) {
    console.error('blog-posts error:', err);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
  }
};
