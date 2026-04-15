/**
 * AI-to-Human Text Rewriter
 * Transforms AI-generated content into natural, human-like writing.
 * Zero dependencies. Works in Node.js and browsers.
 */
(function (root) {
  'use strict';

  // ── Utility helpers ──────────────────────────────────────────────────

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function chance(pct) {
    return Math.random() * 100 < pct;
  }

  function splitSentences(text) {
    // Split on sentence-ending punctuation followed by whitespace or end
    var parts = [];
    var current = '';
    for (var i = 0; i < text.length; i++) {
      current += text[i];
      if ((text[i] === '.' || text[i] === '!' || text[i] === '?') &&
          (i + 1 >= text.length || /\s/.test(text[i + 1])) &&
          current.trim().length > 1) {
        // Avoid splitting on abbreviations like "e.g." or "Dr."
        var trimmed = current.trim();
        if (trimmed.length < 5 && /^[A-Z][a-z]?\.$/.test(trimmed)) {
          continue;
        }
        parts.push(current.trim());
        current = '';
      }
    }
    if (current.trim().length > 0) {
      parts.push(current.trim());
    }
    return parts;
  }

  function splitParagraphs(text) {
    return text.split(/\n\s*\n/).filter(function (p) { return p.trim().length > 0; });
  }

  function joinParagraphs(paragraphs) {
    return paragraphs.join('\n\n');
  }

  // ── Dictionaries ─────────────────────────────────────────────────────

  var AI_TRANSITIONS = [
    'furthermore', 'moreover', 'additionally', 'in addition',
    'consequently', 'nevertheless', 'nonetheless', 'subsequently',
    'henceforth', 'thus', 'hence', 'in conclusion', 'to summarize',
    'in summary', 'it is important to note', 'it is worth noting',
    'it should be noted', 'it is noteworthy', 'as a result',
    'in light of this', 'with that being said', 'that being said',
    'on the other hand', 'in contrast', 'conversely',
    'as previously mentioned', 'as stated above', 'as discussed',
    'in this regard', 'with respect to', 'pertaining to',
    'in the context of', 'it is evident that', 'it is clear that',
    'it goes without saying', 'needless to say', 'undoubtedly',
    'without a doubt', 'it is crucial to', 'it is essential to',
    'it is imperative to', 'it is vital to'
  ];

  var HUMAN_TRANSITIONS = [
    'also', 'plus', 'and', 'but', 'so', 'anyway',
    'thing is', 'look', 'well', 'right', 'okay so',
    'on top of that', 'besides', 'still', 'though',
    'the thing is', 'honestly', 'actually', 'basically'
  ];

  var CONVERSATIONAL_STARTERS = [
    'honestly, ', 'basically, ', 'look, ', 'to be fair, ',
    'truth is, ', 'I mean, ', 'so yeah, ', 'the thing is, ',
    'actually, ', 'really though, ', 'funny enough, ',
    'interestingly, ', 'point is, ', 'long story short, ',
    'bottom line, '
  ];

  var AI_FILLER_PHRASES = [
    /\bin order to\b/gi,
    /\butiliz(?:e|ing|ed|es|ation)\b/gi,
    /\bleverag(?:e|ing|ed|es)\b/gi,
    /\bfacilitat(?:e|ing|ed|es|ion)\b/gi,
    /\bimplement(?:ing|ed|s|ation)?\b/gi,
    /\boptimiz(?:e|ing|ed|es|ation)\b/gi,
    /\bstreamlin(?:e|ing|ed|es)\b/gi,
    /\bseamless(?:ly)?\b/gi,
    /\brobust\b/gi,
    /\bcomprehensive\b/gi,
    /\bensur(?:e|ing|ed|es)\b/gi,
    /\bdelv(?:e|ing|ed|es)\b/gi,
    /\bembark(?:ing|ed|s)?\b/gi,
    /\btapestry\b/gi,
    /\bholistic(?:ally)?\b/gi,
    /\bsynerg(?:y|ize|istic|ies)\b/gi,
    /\bparadigm(?:s)?\b/gi,
    /\bpivotal\b/gi,
    /\binnovative\b/gi,
    /\bcutting[- ]edge\b/gi,
    /\bstate[- ]of[- ]the[- ]art\b/gi,
    /\bgame[- ]chang(?:er|ing)\b/gi,
    /\bgroundbreaking\b/gi,
    /\brevolution(?:ary|ize|izing)\b/gi,
    /\bunparalleled\b/gi,
    /\bmeticulous(?:ly)?\b/gi,
    /\bplethora\b/gi,
    /\bmyriad\b/gi
  ];

  var AI_FILLER_REPLACEMENTS = {
    'in order to': 'to',
    'utilize': 'use',
    'utilizing': 'using',
    'utilized': 'used',
    'utilizes': 'uses',
    'utilization': 'use',
    'leverage': 'use',
    'leveraging': 'using',
    'leveraged': 'used',
    'leverages': 'uses',
    'facilitate': 'help with',
    'facilitating': 'helping with',
    'facilitated': 'helped with',
    'facilitates': 'helps with',
    'facilitation': 'help',
    'implement': 'set up',
    'implementing': 'setting up',
    'implemented': 'set up',
    'implements': 'sets up',
    'implementation': 'setup',
    'optimize': 'improve',
    'optimizing': 'improving',
    'optimized': 'improved',
    'optimizes': 'improves',
    'optimization': 'improvement',
    'streamline': 'simplify',
    'streamlining': 'simplifying',
    'streamlined': 'simplified',
    'streamlines': 'simplifies',
    'seamlessly': 'smoothly',
    'seamless': 'smooth',
    'robust': 'solid',
    'comprehensive': 'thorough',
    'ensure': 'make sure',
    'ensuring': 'making sure',
    'ensured': 'made sure',
    'ensures': 'makes sure',
    'delve': 'dig',
    'delving': 'digging',
    'delved': 'dug',
    'delves': 'digs',
    'embark': 'start',
    'embarking': 'starting',
    'embarked': 'started',
    'embarks': 'starts',
    'tapestry': 'mix',
    'holistic': 'overall',
    'holistically': 'overall',
    'synergy': 'teamwork',
    'synergies': 'combined strengths',
    'synergize': 'work together',
    'synergistic': 'combined',
    'paradigm': 'approach',
    'paradigms': 'approaches',
    'pivotal': 'key',
    'innovative': 'new',
    'cutting-edge': 'modern',
    'cutting edge': 'modern',
    'state-of-the-art': 'latest',
    'state of the art': 'latest',
    'game-changer': 'big deal',
    'game changer': 'big deal',
    'game-changing': 'major',
    'game changing': 'major',
    'groundbreaking': 'exciting',
    'revolutionary': 'new',
    'revolutionize': 'transform',
    'revolutionizing': 'transforming',
    'unparalleled': 'unmatched',
    'meticulously': 'carefully',
    'meticulous': 'careful',
    'plethora': 'bunch',
    'myriad': 'lots of'
  };

  var CONTRACTION_MAP = [
    [/\bI am\b/g, "I'm"],
    [/\bI have\b/g, "I've"],
    [/\bI will\b/g, "I'll"],
    [/\bI would\b/g, "I'd"],
    [/\byou are\b/gi, "you're"],
    [/\byou have\b/gi, "you've"],
    [/\byou will\b/gi, "you'll"],
    [/\byou would\b/gi, "you'd"],
    [/\bhe is\b/gi, "he's"],
    [/\bshe is\b/gi, "she's"],
    [/\bit is\b/gi, "it's"],
    [/\bwe are\b/gi, "we're"],
    [/\bwe have\b/gi, "we've"],
    [/\bwe will\b/gi, "we'll"],
    [/\bthey are\b/gi, "they're"],
    [/\bthey have\b/gi, "they've"],
    [/\bthey will\b/gi, "they'll"],
    [/\bthat is\b/gi, "that's"],
    [/\bwhat is\b/gi, "what's"],
    [/\bthere is\b/gi, "there's"],
    [/\bhere is\b/gi, "here's"],
    [/\bwho is\b/gi, "who's"],
    [/\bdo not\b/gi, "don't"],
    [/\bdoes not\b/gi, "doesn't"],
    [/\bdid not\b/gi, "didn't"],
    [/\bis not\b/gi, "isn't"],
    [/\bare not\b/gi, "aren't"],
    [/\bwas not\b/gi, "wasn't"],
    [/\bwere not\b/gi, "weren't"],
    [/\bhave not\b/gi, "haven't"],
    [/\bhas not\b/gi, "hasn't"],
    [/\bhad not\b/gi, "hadn't"],
    [/\bwill not\b/gi, "won't"],
    [/\bwould not\b/gi, "wouldn't"],
    [/\bcould not\b/gi, "couldn't"],
    [/\bshould not\b/gi, "shouldn't"],
    [/\bcan not\b/gi, "can't"],
    [/\bcannot\b/gi, "can't"],
    [/\blet us\b/gi, "let's"]
  ];

  // ── Tone detection ───────────────────────────────────────────────────

  var EMAIL_SIGNALS = [
    /\bdear\b/i, /\bregards\b/i, /\bsincerely\b/i,
    /\bhi\b/i, /\bhello\b/i, /\bthank you\b/i,
    /\bthanks\b/i, /\bplease find\b/i, /\bkind regards\b/i,
    /\bbest regards\b/i, /\blooking forward\b/i,
    /\bI hope this (?:email|message)\b/i, /\battached\b/i,
    /\bfollow(?:ing)? up\b/i, /\blet me know\b/i,
    /\bsubject:/i, /\bfrom:/i, /\bto:/i
  ];

  var TECHNICAL_SIGNALS = [
    /\bAPI\b/, /\bfunction\b/i, /\bvariable\b/i,
    /\bclass\b/i, /\bobject\b/i, /\barray\b/i,
    /\bdatabase\b/i, /\bserver\b/i, /\bclient\b/i,
    /\bframework\b/i, /\balgorithm\b/i, /\bprotocol\b/i,
    /\brepository\b/i, /\bdeployment\b/i, /\bconfiguration\b/i,
    /\bmodule\b/i, /\binterface\b/i, /\bimplementation\b/i,
    /\bHTTP\b/, /\bJSON\b/, /\bSQL\b/, /\bCSS\b/, /\bHTML\b/,
    /\bcode\b/i, /\bbug\b/i, /\bdebug\b/i
  ];

  function detectTone(text) {
    var emailScore = 0;
    var techScore = 0;
    var i;

    for (i = 0; i < EMAIL_SIGNALS.length; i++) {
      if (EMAIL_SIGNALS[i].test(text)) emailScore++;
    }
    for (i = 0; i < TECHNICAL_SIGNALS.length; i++) {
      if (TECHNICAL_SIGNALS[i].test(text)) techScore++;
    }

    if (emailScore >= 3) return 'email';
    if (techScore >= 3) return 'technical';
    return 'casual';
  }

  // ── AI-ness scorer ───────────────────────────────────────────────────

  function scoreAIness(text) {
    var score = 0;
    var lower = text.toLowerCase();

    // Check for AI transition words
    for (var i = 0; i < AI_TRANSITIONS.length; i++) {
      if (lower.indexOf(AI_TRANSITIONS[i]) !== -1) score += 2;
    }

    // Check for AI filler words
    for (var j = 0; j < AI_FILLER_PHRASES.length; j++) {
      if (AI_FILLER_PHRASES[j].test(text)) {
        score += 2;
        AI_FILLER_PHRASES[j].lastIndex = 0;
      }
    }

    // Uniform sentence length is an AI signal
    var sentences = splitSentences(text);
    if (sentences.length > 3) {
      var lengths = sentences.map(function (s) { return s.split(/\s+/).length; });
      var avg = lengths.reduce(function (a, b) { return a + b; }, 0) / lengths.length;
      var variance = lengths.reduce(function (sum, l) { return sum + Math.pow(l - avg, 2); }, 0) / lengths.length;
      if (variance < 4) score += 5; // very uniform → likely AI
    }

    // Very long paragraphs with no line breaks
    var paras = splitParagraphs(text);
    for (var k = 0; k < paras.length; k++) {
      if (paras[k].split(/\s+/).length > 80) score += 3;
    }

    return score;
  }

  // ── Rule 1: Vary sentence structure ──────────────────────────────────

  function varySentenceStructure(sentences) {
    if (sentences.length <= 1) return sentences;

    var result = [];
    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i];
      var words = s.split(/\s+/);

      // Occasionally merge two short sentences
      if (words.length < 8 && i + 1 < sentences.length && chance(30)) {
        var next = sentences[i + 1];
        var nextWords = next.split(/\s+/);
        if (nextWords.length < 10) {
          // Remove the period from current, join with connector
          var merged = s.replace(/\.\s*$/, '') + ' — ' +
            next.charAt(0).toLowerCase() + next.slice(1);
          result.push(merged);
          i++; // skip next
          continue;
        }
      }

      // Occasionally split very long sentences
      if (words.length > 25 && chance(40)) {
        var mid = Math.floor(words.length / 2);
        // Find a natural break near the midpoint
        var breakPoint = mid;
        for (var j = mid - 3; j <= mid + 3 && j < words.length; j++) {
          if (j < 0) continue;
          var w = words[j].toLowerCase();
          if (['and', 'but', 'which', 'that', 'while', 'because', 'since', 'although'].indexOf(w) !== -1) {
            breakPoint = j;
            break;
          }
        }
        var first = words.slice(0, breakPoint).join(' ');
        var second = words.slice(breakPoint).join(' ');
        if (!first.match(/[.!?]$/)) first += '.';
        second = second.charAt(0).toUpperCase() + second.slice(1);
        result.push(first);
        result.push(second);
        continue;
      }

      result.push(s);
    }
    return result;
  }

  // ── Rule 2: Remove AI patterns ───────────────────────────────────────

  function removeAIPatterns(text) {
    var result = text;

    // Replace AI transition words at the start of sentences
    for (var i = 0; i < AI_TRANSITIONS.length; i++) {
      var transition = AI_TRANSITIONS[i];
      var simpleRegex = new RegExp('\\b' + transition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[,]?\\s', 'gi');
      result = result.replace(simpleRegex, function () {
        return pick(HUMAN_TRANSITIONS) + ', ';
      });
    }

    // Replace AI filler words
    for (var key in AI_FILLER_REPLACEMENTS) {
      if (AI_FILLER_REPLACEMENTS.hasOwnProperty(key)) {
        var re = new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
        var replacement = AI_FILLER_REPLACEMENTS[key];
        result = result.replace(re, function (match) {
          if (!chance(75)) return match; // Don't replace every instance
          // Preserve casing
          if (match.charAt(0) === match.charAt(0).toUpperCase()) {
            return replacement.charAt(0).toUpperCase() + replacement.slice(1);
          }
          return replacement;
        });
      }
    }

    return result;
  }

  // ── Rule 3: Add human imperfections ──────────────────────────────────

  function addContractions(text) {
    var result = text;
    for (var i = 0; i < CONTRACTION_MAP.length; i++) {
      var pair = CONTRACTION_MAP[i];
      result = result.replace(pair[0], function (match) {
        if (chance(80)) return pair[1];
        return match;
      });
    }
    return result;
  }

  function addConversationalConnectors(sentences, tone) {
    if (tone === 'technical') return sentences; // Keep technical text cleaner

    var result = [];
    var addedCount = 0;
    var maxAdds = Math.max(1, Math.floor(sentences.length * 0.2));

    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i];

      // Don't add to the first sentence or too many overall
      if (i > 0 && addedCount < maxAdds && chance(25)) {
        var connector = pick(CONVERSATIONAL_STARTERS);
        // Lowercase the first letter of the sentence when prepending
        s = connector + s.charAt(0).toLowerCase() + s.slice(1);
        addedCount++;
      }
      result.push(s);
    }
    return result;
  }

  // ── Rule 4: Preserve meaning ─────────────────────────────────────────
  // This is enforced by the nature of our transformations:
  // we never add new facts, only adjust phrasing.

  // ── Rule 5: Context-aware tone adjustments ───────────────────────────

  function adjustForEmail(text) {
    // Make email greetings/closings feel more natural
    text = text.replace(/\bI hope this email finds you well\.?\s*/gi, function () {
      return pick([
        'Hope you\'re doing well. ',
        'Hey, hope things are good. ',
        'Quick note — ',
        ''
      ]);
    });
    text = text.replace(/\bPlease do not hesitate to\b/gi, 'Feel free to');
    text = text.replace(/\bPlease feel free to\b/gi, 'Feel free to');
    text = text.replace(/\bAt your earliest convenience\b/gi, 'When you get a chance');
    text = text.replace(/\bI am writing to inform you\b/gi, 'Just wanted to let you know');
    text = text.replace(/\bI would like to bring to your attention\b/gi, 'Wanted to mention');
    text = text.replace(/\bAs per our previous (?:conversation|discussion)\b/gi, 'Like we talked about');
    text = text.replace(/\bKind regards\b/gi, function () {
      return pick(['Thanks', 'Cheers', 'Best', 'Talk soon']);
    });
    text = text.replace(/\bWarm regards\b/gi, function () {
      return pick(['Thanks', 'Cheers', 'Best']);
    });
    text = text.replace(/\bBest regards\b/gi, function () {
      return pick(['Thanks', 'Best', 'Cheers']);
    });
    return text;
  }

  function adjustForTechnical(text) {
    // Keep clarity but reduce robot tone
    text = text.replace(/\bIt is important to note that\b/gi, 'Worth noting:');
    text = text.replace(/\bIt should be noted that\b/gi, 'Note that');
    text = text.replace(/\bIn order to achieve this\b/gi, 'To do this');
    text = text.replace(/\bThe aforementioned\b/gi, 'That');
    text = text.replace(/\bthe above-mentioned\b/gi, 'that');
    return text;
  }

  function adjustForCasual(text) {
    // Loosen structure further
    text = text.replace(/\bIt is important to note that\b/gi, function () {
      return pick(['Thing is,', 'Worth mentioning,', 'Just so you know,']);
    });
    text = text.replace(/\bIt should be noted that\b/gi, function () {
      return pick(['Keep in mind', 'Just note that', 'FYI,']);
    });
    text = text.replace(/\bIt is worth noting that\b/gi, function () {
      return pick(["It's worth knowing that", 'One thing —']);
    });
    text = text.replace(/\bHowever,\s*/gi, function () {
      return pick(['But ', 'Though, ', 'Still, ', 'That said, ']);
    });
    text = text.replace(/\bTherefore,\s*/gi, function () {
      return pick(['So ', 'That means ', 'Basically, ']);
    });
    text = text.replace(/\bFor example,\s*/gi, function () {
      return pick(['Like, ', 'Say, ', 'For instance, ']);
    });
    return text;
  }

  // ── Rule 6: Avoid detection signals ──────────────────────────────────

  function breakParagraphSymmetry(paragraphs) {
    if (paragraphs.length <= 2) return paragraphs;

    var result = [];
    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i].trim();

      // Occasionally merge short adjacent paragraphs
      if (i + 1 < paragraphs.length && chance(20)) {
        var nextP = paragraphs[i + 1].trim();
        var pWords = p.split(/\s+/).length;
        var nextWords = nextP.split(/\s+/).length;
        if (pWords < 20 && nextWords < 20) {
          result.push(p + ' ' + nextP);
          i++;
          continue;
        }
      }

      // Occasionally split long paragraphs
      var sentences = splitSentences(p);
      if (sentences.length > 5 && chance(35)) {
        var splitPoint = Math.floor(sentences.length * (0.4 + Math.random() * 0.2));
        result.push(sentences.slice(0, splitPoint).join(' '));
        result.push(sentences.slice(splitPoint).join(' '));
        continue;
      }

      result.push(p);
    }
    return result;
  }

  function unbalanceLists(text) {
    // Detect numbered or bulleted lists and slightly adjust
    var lines = text.split('\n');
    var inList = false;
    var listItems = [];
    var result = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var isListItem = /^\s*(?:[-*•]|\d+[.)]\s)/.test(line);

      if (isListItem) {
        inList = true;
        listItems.push(line);
      } else {
        if (inList && listItems.length > 0) {
          // Flush the list — occasionally tweak
          if (listItems.length > 3 && chance(40)) {
            // Merge last two items
            var last = listItems.pop();
            var secondLast = listItems.pop();
            var mergedContent = secondLast.replace(/^\s*(?:[-*•]|\d+[.)]\s)/, '').trim();
            var lastContent = last.replace(/^\s*(?:[-*•]|\d+[.)]\s)/, '').trim();
            listItems.push(secondLast.match(/^\s*(?:[-*•]|\d+[.)]\s)/)[0] +
              mergedContent + ', and also ' + lastContent);
          }
          for (var j = 0; j < listItems.length; j++) {
            result.push(listItems[j]);
          }
          listItems = [];
          inList = false;
        }
        result.push(line);
      }
    }
    // Flush remaining list items
    for (var k = 0; k < listItems.length; k++) {
      result.push(listItems[k]);
    }

    return result.join('\n');
  }

  // ── Rule 7: Output format ───────────────────────────────────────────
  // Return only rewritten text. No explanations, notes, or metadata.

  // ── Main rewrite function ────────────────────────────────────────────

  function rewrite(input) {
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return '';
    }

    var text = input.trim();
    var tone = detectTone(text);
    var aiScore = scoreAIness(text);

    // If the text already seems human-like, only lightly adjust
    var isLight = aiScore < 5;

    // Step 1: Split into paragraphs
    var paragraphs = splitParagraphs(text);

    // Process each paragraph
    var processed = paragraphs.map(function (para) {
      var p = para;

      // Rule 2: Remove AI patterns
      p = removeAIPatterns(p);

      // Rule 3: Add contractions
      p = addContractions(p);

      // Rule 5: Tone-specific adjustments
      if (tone === 'email') {
        p = adjustForEmail(p);
      } else if (tone === 'technical') {
        p = adjustForTechnical(p);
      } else {
        p = adjustForCasual(p);
      }

      // Rule 1: Vary sentence structure
      var sentences = splitSentences(p);
      if (!isLight) {
        sentences = varySentenceStructure(sentences);
      }

      // Rule 3: Add conversational connectors (only if not light touch)
      if (!isLight) {
        sentences = addConversationalConnectors(sentences, tone);
      }

      return sentences.join(' ');
    });

    // Rule 6: Break paragraph symmetry
    if (!isLight && processed.length > 2) {
      processed = breakParagraphSymmetry(processed);
    }

    var output = joinParagraphs(processed);

    // Rule 6: Unbalance lists
    output = unbalanceLists(output);

    // Clean up any double spaces
    output = output.replace(/ {2,}/g, ' ');

    // Clean up any weirdly placed punctuation
    output = output.replace(/\s+([.,!?;:])/g, '$1');
    output = output.replace(/([.!?])\s*\1+/g, '$1');

    return output;
  }

  // ── Exports ──────────────────────────────────────────────────────────

  var Rewriter = {
    rewrite: rewrite,
    detectTone: detectTone,
    scoreAIness: scoreAIness
  };

  // Node.js / CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Rewriter;
  }

  // Browser global
  if (typeof root !== 'undefined') {
    root.Rewriter = Rewriter;
  }

})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
