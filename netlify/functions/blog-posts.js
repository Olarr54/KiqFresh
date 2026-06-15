const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
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
  const postsDir = path.join(__dirname, '..', '..', 'blog', 'posts');

  if (!fs.existsSync(postsDir)) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '[]' };
  }

  const files = fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();

  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    const data = parseFrontmatter(raw);
    return {
      slug: file.replace('.md', ''),
      title: data.title || file.replace('.md', ''),
      date: data.date || '',
      excerpt: data.excerpt || '',
    };
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(posts),
  };
};
