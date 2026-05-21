const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ============ Configuration ============
const config = {
  postsPath: process.env.INPUT_POSTS_PATH || './_posts',
  devtoApiKey: process.env.INPUT_DEVTO_API_KEY || '',
  devtoEnabled: process.env.INPUT_DEVTO_ENABLED !== 'false',
  contentMode: process.env.INPUT_CONTENT_MODE || 'summary',
  blogUrl: process.env.INPUT_BLOG_URL || '',
  tags: (process.env.INPUT_TAGS || 'programming,technology').split(',').map(t => t.trim()),
  dryRun: process.env.INPUT_DRY_RUN === 'true',
};

// ============ Utilities ============
function log(msg) {
  console.log(`[Auto Publish] ${msg}`);
}

function httpRequest(url, options, body = null) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ============ Markdown Parser ============
function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontMatter = {};
  match[1].split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      let value = valueParts.join(':').trim();
      // Remove quotes
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim());
      }
      frontMatter[key.trim()] = value;
    }
  });

  return {
    meta: frontMatter,
    body: match[2].trim(),
    title: frontMatter.title || 'Untitled',
    date: frontMatter.date || new Date().toISOString().split('T')[0],
    tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : config.tags,
    coverImage: frontMatter.cover_image || frontMatter.coverImage || '',
    excerpt: frontMatter.excerpt || frontMatter.description || '',
  };
}

// ============ Content Processor ============
function processContent(article, platform) {
  let { body, title, excerpt } = article;

  if (config.contentMode === 'summary' && config.blogUrl) {
    // Keep ~70% of content
    const lines = body.split('\n');
    const cutPoint = Math.floor(lines.length * 0.7);
    body = lines.slice(0, cutPoint).join('\n');

    // Add backlink footer
    body += '\n\n---\n\n';
    body += `> 📢 **This is a summary version. Read the full article with exclusive tools and deep analysis at [WD Tech Blog](${config.blogUrl})!**\n\n`;
    body += `*Follow our blog for the latest tech news, AI tutorials, and productivity tool recommendations!*\n`;
  }

  // Build Dev.to markdown
  if (platform === 'devto') {
    let markdown = `---\ntitle: "${title}"\npublished: true\n`;
    if (article.tags.length > 0) {
      markdown += `tags: ${JSON.stringify(article.tags)}\n`;
    }
    if (article.coverImage) {
      markdown += `cover_image: ${article.coverImage}\n`;
    }
    if (excerpt) {
      markdown += `description: "${excerpt}"\n`;
    }
    markdown += `---\n\n${body}`;
    return markdown;
  }

  return body;
}

// ============ Dev.to Publisher ============
async function checkDevtoDuplicate(title) {
  if (!config.devtoApiKey) return false;
  try {
    const res = await httpRequest('https://dev.to/api/articles/me?per_page=100', {
      headers: { 'api-key': config.devtoApiKey }
    });
    if (res.statusCode === 200) {
      const articles = JSON.parse(res.body);
      return articles.some(a => a.title.toLowerCase() === title.toLowerCase());
    }
  } catch (e) {
    log(`Warning: Could not check Dev.to duplicates: ${e.message}`);
  }
  return false;
}

async function publishToDevto(article) {
  if (!config.devtoEnabled || !config.devtoApiKey) {
    log('Dev.to publishing skipped (not enabled or no API key)');
    return null;
  }

  // Check duplicate
  const isDuplicate = await checkDevtoDuplicate(article.title);
  if (isDuplicate) {
    log(`Skipped "${article.title}" - already published on Dev.to`);
    return { status: 'skipped', reason: 'duplicate' };
  }

  const bodyMarkdown = processContent(article, 'devto');

  if (config.dryRun) {
    log(`[DRY RUN] Would publish "${article.title}" to Dev.to`);
    return { status: 'dry_run', platform: 'devto', title: article.title };
  }

  try {
    const res = await httpRequest('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'api-key': config.devtoApiKey,
        'Content-Type': 'application/json',
      },
    }, JSON.stringify({ body_markdown: bodyMarkdown }));

    if (res.statusCode === 201) {
      const data = JSON.parse(res.body);
      log(`✅ Published "${article.title}" to Dev.to: ${data.url}`);
      return { status: 'published', platform: 'devto', url: data.url, title: article.title };
    } else {
      log(`❌ Failed to publish "${article.title}" to Dev.to: ${res.statusCode} ${res.body}`);
      return { status: 'error', platform: 'devto', error: res.body, title: article.title };
    }
  } catch (e) {
    log(`❌ Error publishing to Dev.to: ${e.message}`);
    return { status: 'error', platform: 'devto', error: e.message, title: article.title };
  }
}

// ============ Main ============
async function main() {
  log('Starting Auto Publish Blog...');
  log(`Posts path: ${config.postsPath}`);
  log(`Content mode: ${config.contentMode}`);
  log(`Dev.to enabled: ${config.devtoEnabled}`);
  log(`Dry run: ${config.dryRun}`);

  // Find markdown files
  const postsDir = path.resolve(config.postsPath);
  if (!fs.existsSync(postsDir)) {
    log(`Posts directory not found: ${postsDir}`);
    return;
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md') || f.endsWith('.markdown'));
  log(`Found ${files.length} markdown files`);

  const results = [];

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const article = parseFrontMatter(content);

    if (!article) {
      log(`Skipped ${file} - no valid front matter`);
      continue;
    }

    log(`Processing: "${article.title}" (${file})`);

    // Publish to Dev.to
    const devtoResult = await publishToDevto(article);
    if (devtoResult) results.push(devtoResult);
  }

  // Summary
  log('\n========== Summary ==========');
  const published = results.filter(r => r.status === 'published');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');
  const dryRuns = results.filter(r => r.status === 'dry_run');

  log(`Published: ${published.length}`);
  log(`Skipped (duplicates): ${skipped.length}`);
  log(`Errors: ${errors.length}`);
  if (config.dryRun) log(`Dry run: ${dryRuns.length}`);

  // Set GitHub Actions output
  if (published.length > 0) {
    const fs = require('fs');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `published-count=${published.length}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `published-urls=${published.map(p => p.url).join(',')}\n`);
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
