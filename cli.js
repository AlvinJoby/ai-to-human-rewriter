#!/usr/bin/env node
/**
 * AI-to-Human Text Rewriter — CLI
 *
 * Usage:
 *   node cli.js "Your AI text here"
 *   echo "Your AI text" | node cli.js
 *   node cli.js --file input.txt
 *   node cli.js "Your text" --aggressive
 *   node cli.js --context=email "Your text"
 *   node cli.js -f input.txt --aggressive --score
 */
'use strict';

var Rewriter = require('./rewriter');
var fs = require('fs');

var VALID_CONTEXTS = ['auto', 'email', 'technical', 'casual', 'professional'];

function printUsage() {
  console.log('AI-to-Human Text Rewriter');
  console.log('');
  console.log('Usage:');
  console.log('  node cli.js "Your AI-generated text here"');
  console.log('  node cli.js --file input.txt');
  console.log('  echo "Your text" | node cli.js');
  console.log('  node cli.js "Your text" --aggressive');
  console.log('  node cli.js --context=email "Your text"');
  console.log('  node cli.js -f input.txt --aggressive --score');
  console.log('');
  console.log('Options:');
  console.log('  --file, -f <path>       Read input from a file');
  console.log('  --help, -h              Show this help message');
  console.log('  --score, -s             Show AI-ness score, pattern count, and detected context');
  console.log('  --aggressive, -a        Use aggressive rewriting level');
  console.log('  --light                 Use light rewriting level');
  console.log('  --context=<ctx>, -c <ctx>');
  console.log('                          Set context override (email, technical, casual, professional)');
}

function parseArgs(argv) {
  var args = argv.slice(2);
  var parsed = {
    showScore: false,
    level: 'medium',
    context: 'auto',
    filePath: null,
    showHelp: false,
    textParts: []
  };

  var i = 0;
  while (i < args.length) {
    var arg = args[i];

    if (arg === '--help' || arg === '-h') {
      parsed.showHelp = true;
      i++;
    } else if (arg === '--score' || arg === '-s') {
      parsed.showScore = true;
      i++;
    } else if (arg === '--aggressive' || arg === '-a') {
      parsed.level = 'aggressive';
      i++;
    } else if (arg === '--light') {
      parsed.level = 'light';
      i++;
    } else if (arg.indexOf('--context=') === 0) {
      parsed.context = arg.slice('--context='.length);
      i++;
    } else if (arg === '--context' || arg === '-c') {
      if (i + 1 < args.length) {
        parsed.context = args[i + 1];
        i += 2;
      } else {
        console.error('Error: --context requires a value.');
        process.exit(1);
      }
    } else if (arg === '--file' || arg === '-f') {
      if (i + 1 < args.length) {
        parsed.filePath = args[i + 1];
        i += 2;
      } else {
        console.error('Error: --file requires a path.');
        process.exit(1);
      }
    } else if (arg.charAt(0) === '-') {
      console.error('Error: Unknown option "' + arg + '".');
      printUsage();
      process.exit(1);
    } else {
      parsed.textParts.push(arg);
      i++;
    }
  }

  if (VALID_CONTEXTS.indexOf(parsed.context) === -1) {
    console.error('Error: Invalid context "' + parsed.context + '". Must be one of: ' + VALID_CONTEXTS.join(', '));
    process.exit(1);
  }

  return parsed;
}

function run(text, opts) {
  if (!text || text.trim().length === 0) {
    console.error('Error: No input text provided.');
    printUsage();
    process.exit(1);
  }

  if (opts.showScore) {
    var tone = Rewriter.detectTone(text);
    var score = Rewriter.scoreAIness(text);
    var patternCount = Rewriter.countAIPatterns(text);
    var label = score < Rewriter.SCORE_THRESHOLD_HUMAN ? '(likely human)' :
                score < Rewriter.SCORE_THRESHOLD_AI ? '(moderate)' : '(likely AI)';
    console.error('Detected context : ' + tone);
    console.error('AI-ness score    : ' + score + ' ' + label);
    console.error('AI patterns found: ' + patternCount);
    console.error('Rewrite level    : ' + opts.level);
    console.error('────────────────────────────────');
  }

  var options = { context: opts.context, level: opts.level };
  var result = Rewriter.rewrite(text, options);
  process.stdout.write(result + '\n');
}

// --- Main ---

var parsed = parseArgs(process.argv);

if (parsed.showHelp) {
  printUsage();
  process.exit(0);
}

if (parsed.filePath) {
  try {
    var content = fs.readFileSync(parsed.filePath, 'utf8');
    run(content, parsed);
  } catch (err) {
    console.error('Error reading file: ' + err.message);
    process.exit(1);
  }
} else if (parsed.textParts.length > 0) {
  run(parsed.textParts.join(' '), parsed);
} else {
  // Read from stdin
  var input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (chunk) {
    input += chunk;
  });
  process.stdin.on('end', function () {
    run(input, parsed);
  });
  if (process.stdin.isTTY) {
    var eofKey = process.platform === 'win32' ? 'Ctrl+Z then Enter' : 'Ctrl+D';
    console.error('Waiting for input on stdin... (' + eofKey + ' to finish, or use --help)');
  }
}
