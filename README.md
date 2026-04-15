# AI-to-Human Text Rewriter

Transform AI-generated content into natural, human-like writing. Runs **100% offline** — no APIs, no servers, no dependencies.

## Quick Start

### HTML Interface (easiest)

Open `index.html` in any browser — that's it. No server needed.

1. Paste AI-generated text in the left panel
2. Click **Rewrite**
3. Copy the output

### CLI

```bash
# Direct text input
node cli.js "Your AI-generated text goes here"

# From a file
node cli.js --file input.txt

# Pipe from stdin
echo "Your text" | node cli.js
cat essay.txt | node cli.js

# Show AI-ness score and detected tone
node cli.js --score "Your text here"
```

## What It Does

The rewriter applies seven rules to make AI text sound human:

1. **Varies sentence structure** — mixes short and long sentences, breaks up uniform rhythm
2. **Removes AI patterns** — replaces "utilize", "leverage", "facilitate" and similar buzzwords with everyday language
3. **Adds human imperfections** — contractions, conversational connectors ("honestly", "basically", "look"), slight redundancy
4. **Preserves meaning** — never adds, removes, or changes facts
5. **Detects tone** — adjusts differently for emails, technical writing, and casual text
6. **Breaks detection signals** — varies paragraph lengths, unbalances lists, removes overly polished transitions
7. **Clean output** — returns only the rewritten text, no explanations or metadata

## Before / After Examples

### AI-Generated Email

**Before:**
```
Dear Mr. Smith, I hope this email finds you well. I am writing to inform you
regarding the project timeline. Please do not hesitate to contact me at your
earliest convenience. Best regards, John
```

**After:**
```
Dear Mr. Smith, Hope you're doing well. Just wanted to let you know about the
project timeline. Feel free to contact me when you get a chance. Cheers, John
```

### AI-Generated Technical Text

**Before:**
```
The API endpoint utilizes a robust authentication protocol to ensure seamless
integration with the database server. The implementation leverages cutting-edge
algorithms to optimize query performance.
```

**After:**
```
The API endpoint uses a solid authentication protocol to make sure smooth
integration with the database server. The implementation uses modern algorithms
to improve query performance.
```

### AI-Generated General Text

**Before:**
```
Furthermore, it is important to note that utilizing innovative and cutting-edge
solutions can significantly streamline your workflow. In order to optimize your
productivity, we recommend implementing a comprehensive strategy.
```

**After:**
```
Thing is, using new and modern solutions can really simplify your workflow. To
improve your productivity, we recommend setting up a thorough strategy.
```

## Files

| File | Purpose |
|------|---------|
| `rewriter.js` | Core rewriting engine — works in Node.js and browsers |
| `cli.js` | Command-line interface |
| `index.html` | Standalone web interface (open directly in browser) |

## How to Run

**Requirements:** Node.js (for CLI) or any modern browser (for HTML interface). Nothing to install.

```bash
# Clone and use immediately
git clone https://github.com/AlvinJoby/ai-to-human-rewriter.git
cd ai-to-human-rewriter

# CLI
node cli.js "Paste your AI text here"

# Web interface — just open in browser
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

## Technical Details

- Zero npm dependencies
- Pure JavaScript (ES5 compatible)
- Works in all modern browsers and Node.js
- No build process needed
- Runs completely offline
- Each run produces slightly different output (natural variation)

## License

MIT