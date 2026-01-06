# Dashboard Scripts

## Auto Translation

`auto-translate.js` is a utility to automatically translate JSON locale files from English to Korean using OpenAI.

### Usage

```bash
node scripts/auto-translate.js <source_file> <target_file>
```

### Example

```bash
node scripts/auto-translate.js src/locales/en.json src/locales/ko.json
```

### Configuration

The script uses `gpt-4o-mini` for cost-effective translation.
Ensure `OPENAI_API_KEY` is set in your environment, or it will use the default project key configured in the script.