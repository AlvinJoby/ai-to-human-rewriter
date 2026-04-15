#!/usr/bin/env node
/**
 * AI-to-Human Text Rewriter — CLI
 *
 * Usage:
 *   node cli.js "Your AI text here"
 *   echo "Your AI text" | node cli.js
 *   node cli.js --file input.txt
 */
'use strict';

var Rewriter = require('./rewriter');
var fs = require('fs');

function printUsage() {
  console.log('AI-to-Human Text Rewriter');
  console.log('');
  console.log('Usage:');
  console.log('  node cli.js "Your AI-generated text here"');
  console.log('  node cli.js --file input.txt');
  console.log('  echo "Your text" | node cli.js');
  console.log('');
  console.log('Options:');
  console.log('  --file, -f <path>   Read input from a file');
  console.log('  --help, -h          Show this help message');
  console.log('  --score, -s         Show AI-ness score and detected tone');
}

function run(text) {
  if (!text || text.trim().length === 0) {
    console.error('Error: No input text provided.');
    printUsage();
    process.exit(1);
  }

  var showScore = process.argv.indexOf('--score') !== -1 ||
                  process.argv.indexOf('-s') !== -1;

  if (showScore) {
    var tone = Rewriter.detectTone(text);
    var score = Rewriter.scoreAIness(text);
    var label = score < Rewriter.SCORE_THRESHOLD_HUMAN ? '(likely human)' :
                score < Rewriter.SCORE_THRESHOLD_AI ? '(moderate)' : '(likely AI)';
    console.error('Detected tone: ' + tone);
    console.error('AI-ness score: ' + score + ' ' + label);
    console.error('---');
  }

  var result = Rewriter.rewrite(text);
  process.stdout.write(result + '\n');
}

// Parse arguments
var args = process.argv.slice(2);

if (args.indexOf('--help') !== -1 || args.indexOf('-h') !== -1) {
  printUsage();
  process.exit(0);
}

// Check for --file flag
var fileIdx = args.indexOf('--file');
if (fileIdx === -1) fileIdx = args.indexOf('-f');

if (fileIdx !== -1 && args[fileIdx + 1]) {
  var filePath = args[fileIdx + 1];
  try {
    var content = fs.readFileSync(filePath, 'utf8');
    run(content);
  } catch (err) {
    console.error('Error reading file: ' + err.message);
    process.exit(1);
  }
} else {
  // Filter out option flags to get the text argument
  var textArgs = args.filter(function (a) {
    return a !== '--score' && a !== '-s';
  });

  if (textArgs.length > 0) {
    run(textArgs.join(' '));
  } else {
    // Read from stdin
    var input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (chunk) {
      input += chunk;
    });
    process.stdin.on('end', function () {
      run(input);
    });
    // If stdin is a TTY and no data is piped, show help after a short timeout
    if (process.stdin.isTTY) {
      var eofKey = process.platform === 'win32' ? 'Ctrl+Z then Enter' : 'Ctrl+D';
      console.error('Waiting for input on stdin... (' + eofKey + ' to finish, or use --help)');
    }
  }
}
