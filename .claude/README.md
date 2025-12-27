# Claude Local Settings

This directory contains local settings for Claude Code (Anthropic's AI coding assistant).

## Setup Instructions

### 1. Create your local settings file

Copy the example template to create your own local settings:

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

Or on Windows:
```cmd
copy .claude\settings.local.json.example .claude\settings.local.json
```

### 2. Permission template

The example template provides a reasonable set of permissions for common deployment operations:

```json
{
  "permissions": {
    "allow": [
      "Bash(ssh:*)",
      "Bash(scp:*)",
      "Bash(ssh-keyscan:*)",
      "Bash(ping:*)",
      "Bash(tasklist:*)",
      "Bash(findstr:*)",
      "Bash(cat:*)",
      "Bash(where:*)",
      "Bash(dir:*)",
      "Bash(tar:*)"
    ]
  }
}
```

### 3. Adding custom permissions (optional)

If you need more specific permissions, you can add them to the `allow` array. For example:

```json
"Bash(ssh root@your-server.com:*)"
```

## Important Notes

- **DO NOT** commit `settings.local.json` - it contains sensitive information (IP addresses, paths)
- The file is already in `.gitignore` to prevent accidental commits
- Only commit changes to `settings.local.json.example` (the template)