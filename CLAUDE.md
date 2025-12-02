# Claude Code Instructions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Supabase MCP Integration

### Configuration
The project is configured with **Supabase MCP server** integration, providing direct database access capabilities alongside Task Master AI.

### Available Tools

**Database Operations:**
- `queryDatabase` - Query data from Postgres tables with filters
- `insertData` - Insert data into Postgres tables
- `updateData` - Update existing data in Postgres tables
- `deleteData` - Delete data from Postgres tables
- `listTables` - Get list of available tables in the database

**Connection Details:**
- **Supabase URL**: https://bmwuxzysmznqukvnziqc.supabase.co
- **Database**: PostgreSQL with SERVICE_ROLE_KEY access (full administrative privileges)
- **Authentication**: JWT with service role permissions

### Usage Examples

```bash
# List all tables in the database
listTables()

# Query specific table with filters
queryDatabase(table="users", select="id,email,created_at")

# Insert new data
insertData(table="news", data={title: "New Article", content: "Article content"})

# Update existing records
updateData(table="users", data={status: "active"}, query={id: 1})

# Delete records with conditions
deleteData(table="comments", query={post_id: 5})
```

### Integration Notes

**Dual Server Setup:**
- **Task Master AI**: Project management and task tracking
- **Supabase MCP**: Direct database operations and data management

**Security Configuration:**
- Using SERVICE_ROLE_KEY for full administrative access
- Database URL configured for direct PostgreSQL connection
- Local-only configuration (credentials not in version control)

**For Development:**
- Perfect for migrating static content to database
- Enables backend development with real data
- Supports rapid prototyping with live database connection
- Maintains separation from Task Master workflow

Take the entire UI design style and structure from: STYLE_GUIDE.MD , ./taskmaster/docs/index.html and ./taskmaster/docs/style.css
