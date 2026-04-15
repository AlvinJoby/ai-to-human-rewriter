# AI-to-Human Text Rewriter

> **Transform AI-generated content into natural, human-like writing**

`100% Offline` · `Zero Dependencies` · `Browser & Node.js`

No APIs, no servers, no tracking — everything runs locally on your device.

---

## Quick Start

### HTML Interface

Open `index.html` in any browser — no server needed.

1. Paste AI-generated text in the left panel
2. Pick a context and difficulty level
3. Click **Rewrite** (or press `Ctrl+Enter`)
4. Copy the result

```bash
# Open the web interface
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

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

---

## How It Works — The Transformation Pipeline

The rewriter runs text through a **6-stage pipeline**. Each stage targets a different dimension of "AI-ness" to produce output that reads like a real person wrote it.

### Stage 1: AI Detection

Scores the input text for AI-ness by scanning for known AI patterns, measuring sentence uniformity, and checking vocabulary choices. The score determines whether the text needs transformation and how aggressively to apply it.

### Stage 2: Pattern Removal

Strips out **100+ AI-specific phrases** across several categories:

- **Formal greetings & closings** — "I hope this message finds you well", "Best regards", etc.
- **Buzzwords** — "utilize", "leverage", "facilitate", "streamline", "cutting-edge"
- **Passive voice constructions** — "it should be noted that", "it is important to"
- **Filler transitions** — "furthermore", "moreover", "in conclusion", "to summarize"

Each pattern maps to multiple casual replacements, chosen at random for variety.

### Stage 3: Sentence Restructuring

Breaks long, compound sentences into shorter ones. Merges overly short fragments. Varies sentence rhythm so the output doesn't have that characteristic AI cadence of perfectly uniform length.

### Stage 4: Human Voice Injection

Adds the small imperfections that make writing feel human:

- **Contractions** — "do not" → "don't", "it is" → "it's"
- **Conversational starters** — "Honestly,", "Look,", "Thing is,"
- **Thinking pauses** — "basically", "you know", "I mean"
- **Casual questions** — rhetorical asides that break up monotone delivery

### Stage 5: Context Adjustment

Tailors the output based on the detected (or overridden) content type:

| Context | What It Does |
|---|---|
| **email** | Strips formal greetings/closings, adds casual openers |
| **technical** | Keeps precision and terminology, reduces stiffness |
| **casual** | Maximum informality, full conversational tone |
| **professional** | Warm but polished, business-appropriate |

### Stage 6: Final Polish

Cleans up artifacts left by earlier stages — fixes doubled spaces, broken punctuation, capitalization issues, and trailing whitespace. Ensures the output is ready to use with no manual cleanup.

---

## Before / After Examples

### Email

**Before:**
```
I hope this message finds you in good health. I am writing to inform you that
the project deadline has been extended by two weeks.
```

**After:**
```
Hey! So heads up — the project deadline just got pushed back two weeks.
```

### Professional

**Before:**
```
To summarize, the implementation of the new system has resulted in a significant
improvement in operational efficiency.
```

**After:**
```
Bottom line — the new system setup is working way better. Operations are running
smoother now.
```

### Technical

**Before:**
```
It is imperative that the API endpoints are properly documented and thoroughly
tested before deployment.
```

**After:**
```
We really need to make sure the API endpoints are well-documented and properly
tested before we push this live.
```

---

## Advanced Usage

### Context Modes

Set the context to control how the rewriter adjusts tone and vocabulary.

| Mode | Description |
|---|---|
| `auto` (default) | Auto-detects content type from the input |
| `email` | Removes formal greetings/closings, adds casual openers |
| `technical` | Maintains precision, reduces formality |
| `casual` | Maximum informality, conversational tone |
| `professional` | Professional but warm |

### Difficulty Levels

Control how aggressively the rewriter transforms the text.

| Level | Behavior |
|---|---|
| `light` | Only replaces AI buzzwords and adds contractions |
| `medium` (default) | Full pipeline with moderate randomness |
| `aggressive` | Maximum transformation, more casual injections |

### CLI Flags

```bash
# Aggressive rewriting
node cli.js "text" --aggressive

# Set context explicitly
node cli.js --context=email "text"

# Read from file, show score, aggressive mode
node cli.js -f input.txt --score -a

# Light rewriting via pipe
echo "text" | node cli.js --light

# Show help
node cli.js --help
```

| Flag | Short | Description |
|---|---|---|
| `--file <path>` | `-f` | Read input from a file |
| `--score` | `-s` | Show AI-ness score, pattern count, and detected context |
| `--aggressive` | `-a` | Use aggressive rewriting level |
| `--light` | | Use light rewriting level |
| `--context=<ctx>` | `-c` | Set context override (`email`, `technical`, `casual`, `professional`) |
| `--help` | `-h` | Show help message |

### Programmatic API (Node.js)

```js
var Rewriter = require('./rewriter');

// Rewrite text with options
var result = Rewriter.rewrite(text, { context: 'email', level: 'aggressive' });

// Score how AI-like the text is
var score = Rewriter.scoreAIness(text);

// Count the number of AI patterns found
var patterns = Rewriter.countAIPatterns(text);

// Detect the tone/context of the text
var tone = Rewriter.detectTone(text);
```

---

## HTML Interface Features

The web interface (`index.html`) is a standalone, single-file app with a dark-mode design.

- **Context selector dropdown** — choose auto, email, technical, casual, or professional
- **Difficulty level slider** — Light / Medium / Aggressive
- **Side-by-side comparison** — input on the left, output on the right
- **AI pattern count display** — shows how many AI patterns were detected
- **AI score with severity indicator** — color-coded score (green/yellow/red)
- **Statistics bar** — words, sentences, patterns found, AI score, detected context, percentage changed
- **Copy to clipboard** — one-click copy of the rewritten output
- **Ctrl+Enter shortcut** — rewrite without reaching for the mouse
- **Dark mode design** — easy on the eyes, built-in

---

## Files

| File | Purpose |
|---|---|
| `rewriter.js` | Core rewriting engine — works in Node.js and browsers (UMD) |
| `cli.js` | Command-line interface with flag parsing and stdin support |
| `index.html` | Standalone web interface (open directly in browser, no server needed) |

---

## Tips for Best Results

- **Start with medium level** — go aggressive only if the text still sounds AI-generated
- **Use the score feature** (`--score`) to check how AI-ish text is before and after
- **Each run produces slightly different output** — natural variation is built in, so re-run if you want alternatives
- **Already-human text gets minimal changes** — the detection algorithm avoids over-processing natural writing
- **Use context override** when auto-detection doesn't match your content (e.g., force `email` for a message that was detected as `professional`)

---

## Technical Details

- Zero npm dependencies
- Pure JavaScript (ES5 compatible)
- Works in all modern browsers and Node.js
- No build process needed
- 100% offline — no data ever leaves your device
- Each run produces varied output (randomized replacements)

---

## License

MIT