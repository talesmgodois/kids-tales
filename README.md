# Kids' Tales 
Lets sell some stories and tales that you can read for your children

## Multiblog module

This project now includes a `multiblog` module at `src/multiblog` to support
multiple virtual blogs managed by one CMS engine (Ghost).

### Structure

- `src/multiblog/clients/cli`: CLI commands for operations.
- `src/multiblog/core`: Core domain services, DB access, and Ghost integration.

### Environment variables

- `MULTIBLOG_DATABASE_URL` (required): PostgreSQL connection string.
- `MULTIBLOG_REDIS_URL` (optional): Redis URL (default `redis://localhost:6379`).

### CLI usage

```bash
bun run multiblog:cli register-blog --slug tech-blog --name "Tech Blog" --ghost-url http://localhost:2368 --ghost-admin-key "<keyId>:<hexSecret>"
bun run multiblog:cli create-post --blog-slug tech-blog --title "My post" --html "<p>Hello world</p>"
bun run multiblog:cli publish --blog-slug tech-blog --post-id <uuid>
```

The CLI writes post ownership in PostgreSQL and caches recent lookups in Redis.
