# Auto Publish Blog 🚀

Automatically publish your Markdown blog posts to multiple platforms with one GitHub push.

## Features

- **Multi-platform publishing**: Dev.to, and more coming soon
- **Content differentiation**: Publish full articles to your blog, summaries to platforms with backlinks
- **Cover image support**: Automatically extracts and uploads cover images
- **SEO optimization**: Generates meta descriptions, Open Graph tags
- **Duplicate detection**: Prevents accidental double publishing
- **Dry run mode**: Preview what would be published without actually publishing
- **GitHub Actions native**: Runs directly in your CI/CD pipeline

## Supported Platforms

| Platform | Status | Method |
|----------|--------|--------|
| Dev.to | ✅ Supported | API |
| Hashnode | 🔜 Coming Soon | API |
| Medium | 🔜 Coming Soon | API |

## Quick Start

### Basic Usage

```yaml
name: Publish Blog Posts

on:
  push:
    paths:
      - '_posts/**/*.md'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Auto Publish
        uses: WDSEGA/auto-publish-blog@v1
        with:
          devto-api-key: ${{ secrets.DEVTO_API_KEY }}
          blog-url: 'https://yourblog.com'
          content-mode: 'summary'
```

### With All Options

```yaml
- name: Auto Publish
  uses: WDSEGA/auto-publish-blog@v1
  with:
    posts-path: './_posts'
    devto-api-key: ${{ secrets.DEVTO_API_KEY }}
    devto-enabled: 'true'
    content-mode: 'summary'
    blog-url: 'https://yourblog.com'
    tags: 'programming,technology,ai'
    dry-run: 'false'
```

## Configuration

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `posts-path` | No | `./_posts` | Path to your Markdown posts directory |
| `devto-api-key` | No* | - | Dev.to API key (*required if Dev.to enabled) |
| `devto-enabled` | No | `true` | Enable or disable Dev.to publishing |
| `content-mode` | No | `summary` | `full` (100%) or `summary` (70% + backlink) |
| `blog-url` | No | - | Your blog URL for backlinks |
| `tags` | No | `programming,technology` | Default tags for all posts |
| `dry-run` | No | `false` | Preview mode without publishing |

### Content Modes

**Full Mode** (`content-mode: full`)
- Publishes the complete article to all platforms
- Best for: exclusive content, SEO

**Summary Mode** (`content-mode: summary`) - Recommended
- Publishes ~70% of the article
- Adds a backlink footer to drive traffic to your blog
- Best for: content distribution and traffic building

Example summary footer:
```
---
> 📢 This is a summary version. Read the full article with exclusive tools and deep analysis at [Your Blog](https://yourblog.com)!
```

## How It Works

1. **Detect new posts**: Scans your posts directory for new/modified Markdown files
2. **Parse front matter**: Extracts title, date, tags, cover image from YAML front matter
3. **Check duplicates**: Queries each platform API to prevent double publishing
4. **Process content**: Applies content mode (full or summary)
5. **Publish**: Posts to each enabled platform via their API
6. **Report**: Outputs results with links to published articles

## Front Matter Support

Your Markdown posts should include YAML front matter:

```markdown
---
title: "Your Article Title"
date: 2026-05-21
tags: [programming, ai, tutorial]
cover_image: ./assets/images/cover.jpg
excerpt: "A brief description of your article"
---

Your article content here...
```

## Setup Dev.to API Key

1. Go to [dev.to/settings/account](https://dev.to/settings/account)
2. Scroll to "DEV Community API Keys"
3. Generate a new API key
4. Add it to your GitHub repository secrets as `DEVTO_API_KEY`

## Requirements

- Markdown posts with YAML front matter
- GitHub Actions enabled in your repository
- Platform API keys stored as repository secrets

## License

MIT License - free for personal and commercial use.

## Support

- [Report Issues](https://github.com/WDSEGA/auto-publish-blog/issues)
- [Discussions](https://github.com/WDSEGA/auto-publish-blog/discussions)
