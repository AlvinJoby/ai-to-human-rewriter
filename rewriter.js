/**
 * AI-to-Human Text Rewriter v4.0
 * Full-structure rewrite pipeline focused on human rhythm and natural flow.
 * ES5, zero dependencies, browser + Node compatible.
 */
(function (root, factory) {
  'use strict';
  var mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.Rewriter = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCORE_THRESHOLD_HUMAN = 8;
  var SCORE_THRESHOLD_AI = 18;

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function chance(p) { return Math.random() < p; }
  function clamp(n, min, max) { return n < min ? min : (n > max ? max : n); }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function ucFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function lcFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  function wc(text) {
    var m = (text || '').match(/\S+/g);
    return m ? m.length : 0;
  }

  function normalizeWhitespace(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  function splitParagraphs(text) {
    return text.split(/\n\s*\n/);
  }

  function splitSentences(text) {
    var out = [];
    var buf = '';
    var i;

    for (i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      buf += ch;
      if (/[.!?]/.test(ch)) {
        var next = text.charAt(i + 1);
        if (!next || /\s/.test(next)) {
          out.push(buf.trim());
          buf = '';
          while (i + 1 < text.length && /\s/.test(text.charAt(i + 1)) && text.charAt(i + 1) !== '\n') i++;
        }
      }
    }

    if (buf.trim()) out.push(buf.trim());
    return out.filter(function (s) { return s.length > 0; });
  }

  function ensureEnd(sentence) {
    var s = (sentence || '').trim();
    if (!s) return '';
    if (!/[.!?]$/.test(s)) s += '.';
    return s;
  }

  function firstTwoLower(s) {
    var m = s.match(/^\s*([A-Za-z']+)\s+([A-Za-z']+)/);
    return m ? (m[1].toLowerCase() + ' ' + m[2].toLowerCase()) : '';
  }

  var PHRASE_PATTERNS = [
    [/\bI hope this (?:message|email) finds you(?: well| in good health)?[.,;:\s]*/gi, ['']],
    [/\bI am writing to inform you(?: that)?\s*/gi, ['']],
    [/\bPlease be advised(?: that)?\s*/gi, ['']],
    [/\bAt your earliest convenience\b/gi, ['when you can']],
    [/\bIn conclusion[.,;]?\s*/gi, ['']],
    [/\bTo summarize[.,;]?\s*/gi, ['']],
    [/\bIn summary[.,;]?\s*/gi, ['']],
    [/\bNeedless to say[.,;]?\s*/gi, ['']],
    [/\bIt is important to note(?: that)?\s*/gi, ['']],
    [/\bIt should be noted(?: that)?\s*/gi, ['']],
    [/\bIt is worth noting(?: that)?\s*/gi, ['']],
    [/\bIt is clear(?: that)?\s*/gi, ['']],
    [/\bIt is obvious(?: that)?\s*/gi, ['']],
    [/\bFurthermore[.,;]?\s*/gi, ['']],
    [/\bMoreover[.,;]?\s*/gi, ['']],
    [/\bAdditionally[.,;]?\s*/gi, ['']],
    [/\bConsequently[.,;]?\s*/gi, ['']],
    [/\bTherefore[.,;]?\s*/gi, ['']],
    [/\bNonetheless[.,;]?\s*/gi, ['']],
    [/\bNevertheless[.,;]?\s*/gi, ['']],
    [/\bIn order to\b/gi, ['to']],
    [/\bDue to the fact that\b/gi, ['because']],
    [/\bWith regard(?:s)? to\b/gi, ['about']],
    [/\bWith respect to\b/gi, ['about']],
    [/\bIn terms of\b/gi, ['for']],
    [/\bPrior to\b/gi, ['before']],
    [/\bSubsequent to\b/gi, ['after']],
    [/\bKindly\b/gi, ['Please']]
  ];

  var BUZZWORD_PATTERNS = [
    [/\butiliz(?:e|es|ed|ing)\b/gi, function (m) {
      var map = { utilize: 'use', utilizes: 'uses', utilized: 'used', utilizing: 'using' };
      return map[m.toLowerCase()] || 'use';
    }],
    [/\bleverag(?:e|es|ed|ing)\b/gi, function (m) {
      var map = { leverage: 'use', leverages: 'uses', leveraged: 'used', leveraging: 'using' };
      return map[m.toLowerCase()] || 'use';
    }],
    [/\bfacilitat(?:e|es|ed|ing)\b/gi, function (m) {
      var map = { facilitate: 'help', facilitates: 'helps', facilitated: 'helped', facilitating: 'helping' };
      return map[m.toLowerCase()] || 'help';
    }],
    [/\bimplement(?:ation|ed|ing|s)?\b/gi, function (m) {
      var l = m.toLowerCase();
      if (l === 'implementation') return pick(['setup', 'rollout', 'build']);
      if (l === 'implementing') return 'building';
      if (l === 'implemented') return 'built';
      if (l === 'implements') return 'builds';
      return pick(['build', 'set up']);
    }],
    [/\boptimiz(?:e|es|ed|ing|ation)\b/gi, function (m) {
      var l = m.toLowerCase();
      if (l === 'optimization') return pick(['improvement', 'tuning']);
      if (l === 'optimizing') return 'improving';
      if (l === 'optimized') return 'improved';
      if (l === 'optimizes') return 'improves';
      return pick(['improve', 'refine']);
    }],
    [/\bstreamlin(?:e|es|ed|ing)\b/gi, function (m) {
      var l = m.toLowerCase();
      if (l === 'streamlining') return 'simplifying';
      if (l === 'streamlined') return 'simplified';
      if (l === 'streamlines') return 'simplifies';
      return 'simplify';
    }],
    [/\brobust\b/gi, ['solid', 'reliable']],
    [/\bseamless(?:ly)?\b/gi, function (m) { return /ly$/i.test(m) ? 'smoothly' : 'smooth'; }],
    [/\bcutting-edge\b/gi, ['modern', 'up-to-date']],
    [/\bstate[- ]of[- ]the[- ]art\b/gi, ['modern', 'high-quality']],
    [/\bholistic\b/gi, ['end-to-end', 'complete']],
    [/\bensure(?:s|d|ing)?\b/gi, function (m) {
      var map = { ensure: 'make sure', ensures: 'makes sure', ensured: 'made sure', ensuring: 'making sure' };
      return map[m.toLowerCase()] || 'make sure';
    }]
  ];

  var PASSIVE_PATTERNS = [
    [/\bIt has been determined that\s*/gi, 'We found that '],
    [/\bIt was found that\s*/gi, 'We found that '],
    [/\bIt has been shown that\s*/gi, 'Data shows that '],
    [/\bIt is recommended that\s*/gi, 'We should '],
    [/\bIt is expected that\s*/gi, 'We expect that ']
  ];

  var CONNECTOR_PREFIX = /^\s*(?:Also|Plus|And|So|That said|In short|Short version|Bottom line|Worth noting|Keep in mind|Additionally|Furthermore|Moreover|Consequently|Therefore|Nonetheless|Nevertheless)[,:-]?\s+/i;

  var ALL_PATTERNS = [].concat(PHRASE_PATTERNS, BUZZWORD_PATTERNS, PASSIVE_PATTERNS);

  var CONTRACTION_MAP = {
    'I am': "I'm", 'I have': "I've", 'I will': "I'll", 'I would': "I'd",
    'you are': "you're", 'you have': "you've", 'you will': "you'll", 'you would': "you'd",
    'we are': "we're", 'we have': "we've", 'we will': "we'll", 'we would': "we'd",
    'they are': "they're", 'they have': "they've", 'they will': "they'll", 'they would': "they'd",
    'it is': "it's", 'that is': "that's", 'there is': "there's", 'here is': "here's",
    'do not': "don't", 'does not': "doesn't", 'did not': "didn't",
    'is not': "isn't", 'are not': "aren't", 'was not': "wasn't", 'were not': "weren't",
    'have not': "haven't", 'has not': "hasn't", 'had not': "hadn't",
    'cannot': "can't", 'can not': "can't", 'will not': "won't", 'would not': "wouldn't",
    'should not': "shouldn't", 'could not': "couldn't", 'might not': "mightn't",
    'let us': "let's"
  };

  function detectTone(text) {
    if (!text || !text.trim()) return 'casual';

    var lower = text.toLowerCase();
    var email = countTermHits(lower, ['subject:', 'regards', 'sincerely', 'dear ', 'attached', 'follow up', 'meeting']);
    var tech = countTermHits(lower, ['api', 'endpoint', 'database', 'deploy', 'repository', 'runtime', 'refactor', 'json', 'sql', 'module', 'test']);
    var pro = countTermHits(lower, ['stakeholder', 'roadmap', 'kpi', 'roi', 'initiative', 'budget', 'milestone', 'executive']);

    if (tech >= 2 && tech >= email) return 'technical';
    if (email >= 2) return 'email';
    if (pro >= 2) return 'professional';
    return 'casual';
  }

  function countTermHits(lowerText, terms) {
    var i;
    var score = 0;
    for (i = 0; i < terms.length; i++) {
      if (lowerText.indexOf(terms[i]) !== -1) score++;
    }
    return score;
  }

  function replacePatterns(text, patterns) {
    var i;
    for (i = 0; i < patterns.length; i++) {
      var re = patterns[i][0];
      var replacement = patterns[i][1];
      re.lastIndex = 0;

      if (typeof replacement === 'function') {
        text = text.replace(re, replacement);
      } else if (Object.prototype.toString.call(replacement) === '[object Array]') {
        text = text.replace(re, function (matched) {
          var next = pick(replacement);
          if (/^[a-z]/.test(matched) && /^[A-Z]/.test(next)) next = lcFirst(next);
          return next;
        });
      } else {
        text = text.replace(re, replacement);
      }
    }
    return text;
  }

  function normalizeSentenceLead(sentence) {
    var s = sentence.replace(CONNECTOR_PREFIX, '');
    s = s.replace(/^\s*The fact of the matter is that\s+/i, '');
    s = s.replace(/^\s*It is clear that\s+/i, '');
    s = s.replace(/^\s*It is obvious that\s+/i, '');
    s = s.replace(/^\s*In today'?s (?:fast[- ]paced|digital) (?:world|environment),?\s*/i, '');
    return s.trim();
  }

  function flipBecauseClause(sentence) {
    var s = sentence;
    var m = s.match(/^(.+?)\s+because\s+(.+?)([.!?])?$/i);
    if (!m) return s;

    var main = m[1].trim();
    var reason = m[2].trim();
    if (wc(main) < 4 || wc(reason) < 3) return s;
    return 'Because ' + lcFirst(reason) + ', ' + lcFirst(main) + '.';
  }

  function splitLongSentence(sentence) {
    var s = ensureEnd(sentence);
    var splitters = [
      /,\s*(?:but|and|because|while|which|although|since)\s+/i,
      /;\s+/,
      /\s+(?:however|therefore|meanwhile)\s+/i
    ];

    var i;
    for (i = 0; i < splitters.length; i++) {
      var idx = s.search(splitters[i]);
      if (idx > 14 && idx < s.length - 14) {
        var match = s.match(splitters[i]);
        if (!match) continue;

        var a = s.slice(0, idx).trim();
        var b = s.slice(idx + match[0].length).trim();
        if (wc(a) < 4 || wc(b) < 4) continue;

        if (!/[.!?]$/.test(a)) a += '.';
        if (!/[.!?]$/.test(b)) b += '.';
        return [a, ucFirst(b)];
      }
    }

    return [s];
  }

  function mergeSentencePair(a, b) {
    var sa = ensureEnd(a).replace(/[.!?]+$/, '');
    var sb = ensureEnd(b).replace(CONNECTOR_PREFIX, '').replace(/^[A-Z]/, function (c) { return c.toLowerCase(); }).replace(/[.!?]+$/, '');
    return ensureEnd(sa + ' and ' + sb);
  }

  function contextWordPass(text, context) {
    var out = text;

    if (context === 'technical' || context === 'professional') {
      out = out.replace(/^(?:Hi|Hey|Hello),?\s+/i, '');
      out = out.replace(/\bgonna\b/gi, 'going to');
      out = out.replace(/\bgotta\b/gi, 'need to');
      out = out.replace(/\bguys\b/gi, 'team');
    }

    if (context === 'technical') {
      out = out.replace(/\bkind of\b/gi, 'somewhat');
    }

    if (context === 'email') {
      out = out.replace(/\bTo whom it may concern[:,]?\s*/gi, 'Hi, ');
      out = out.replace(/\bPlease find attached\b/gi, "I've attached");
      out = out.replace(/\bThank you in advance\b/gi, 'Thanks');
    }

    if (context === 'casual') {
      out = out.replace(/\btherefore\b/gi, 'so');
      out = out.replace(/\bhowever\b/gi, 'but');
      out = out.replace(/\bthus\b/gi, 'so');
    }

    return out;
  }

  function applyContractions(text, probability) {
    var keys = [];
    var key;
    for (key in CONTRACTION_MAP) {
      if (CONTRACTION_MAP.hasOwnProperty(key)) keys.push(key);
    }
    keys.sort(function (a, b) { return b.length - a.length; });

    var i;
    for (i = 0; i < keys.length; i++) {
      if (!chance(probability)) continue;
      var re = new RegExp('\\b' + escRe(keys[i]) + '\\b', 'gi');
      text = text.replace(re, CONTRACTION_MAP[keys[i]]);
    }

    return text;
  }

  function rebuildCadence(sentences, strength) {
    var base = [];
    var i;

    for (i = 0; i < sentences.length; i++) {
      var s = normalizeSentenceLead(sentences[i]);
      if (!s) continue;
      s = ensureEnd(s);

      if (wc(s) > (strength > 0.75 ? 17 : 24)) {
        var split = splitLongSentence(s);
        var j;
        for (j = 0; j < split.length; j++) base.push(ensureEnd(split[j]));
      } else {
        base.push(s);
      }
    }

    if (base.length < 2) return base;

    var shaped = [];
    for (i = 0; i < base.length; i++) {
      var cur = base[i];
      var next = base[i + 1];
      if (!next) {
        shaped.push(cur);
        continue;
      }

      var curLead = firstTwoLower(cur);
      var nextLead = firstTwoLower(next);
      var curWords = wc(cur);
      var nextWords = wc(next);

      if (curLead && nextLead && curLead === nextLead && (strength >= 0.6 || chance(0.55 * strength))) {
        shaped.push(mergeSentencePair(cur, next));
        i++;
      } else if (curWords < 8 && nextWords < 12 && chance(0.20 * strength)) {
        shaped.push(mergeSentencePair(cur, next));
        i++;
      } else {
        shaped.push(cur);
      }
    }

    return shaped;
  }

  function recastSentence(sentence, context, strength) {
    var s = sentence;

    s = replacePatterns(s, PHRASE_PATTERNS);
    s = replacePatterns(s, BUZZWORD_PATTERNS);
    s = replacePatterns(s, PASSIVE_PATTERNS);
    s = contextWordPass(s, context);
    s = normalizeSentenceLead(s);
    s = flipBecauseClause(s);
    s = ensureEnd(s);

    // Force a light structural touch in medium/aggressive when sentence stayed almost unchanged.
    if (strength >= 0.5 && wc(s) > 10 && chance(0.35)) {
      var parts = splitLongSentence(s);
      if (parts.length > 1) {
        s = ensureEnd(parts.join(' '));
      }
    }

    return s;
  }

  function rewriteParagraph(paragraph, context, strength) {
    var sourceSentences = splitSentences(paragraph);
    if (!sourceSentences.length) return paragraph;

    var transformed = [];
    var i;

    for (i = 0; i < sourceSentences.length; i++) {
      var rewritten = recastSentence(sourceSentences[i], context, strength);
      if (rewritten) transformed.push(rewritten);
    }

    transformed = rebuildCadence(transformed, strength);

    var out = transformed.join(' ');

    var contractionProb = clamp(0.35 + (strength * 0.50), 0.25, 0.95);
    if (context === 'technical') contractionProb = clamp(contractionProb - 0.12, 0.2, 0.8);
    out = applyContractions(out, contractionProb);

    return out;
  }

  function polish(text) {
    var out = String(text || '');
    out = out.replace(/[ \t]{2,}/g, ' ');
    out = out.replace(/ ,/g, ',');
    out = out.replace(/ \./g, '.');
    out = out.replace(/!{2,}/g, '!');
    out = out.replace(/\?{2,}/g, '?');
    out = out.replace(/\s+([,.!?;:])/g, '$1');
    out = out.replace(/([,.!?;:])(\S)/g, '$1 $2');
    out = out.replace(/\n{3,}/g, '\n\n');
    out = out.replace(/(^|[.!?]\s+)([a-z])/g, function (_, p, c) { return p + c.toUpperCase(); });
    return out.trim();
  }

  function countAIPatterns(text) {
    if (!text) return 0;
    var count = 0;
    var i;

    for (i = 0; i < ALL_PATTERNS.length; i++) {
      ALL_PATTERNS[i][0].lastIndex = 0;
      var matches = text.match(ALL_PATTERNS[i][0]);
      if (matches) count += matches.length;
    }

    return count;
  }

  function sentenceVarianceScore(text) {
    var s = splitSentences(text);
    if (s.length < 3) return 0;

    var lens = [];
    var i;
    var avg = 0;
    var variance = 0;

    for (i = 0; i < s.length; i++) {
      lens.push(wc(s[i]));
      avg += wc(s[i]);
    }

    avg /= s.length;

    for (i = 0; i < lens.length; i++) {
      variance += (lens[i] - avg) * (lens[i] - avg);
    }
    variance /= lens.length;

    if (variance < 12) return 5;
    if (variance < 20) return 2;
    return 0;
  }

  function scoreAIness(text) {
    if (!text || !text.trim()) return 0;

    var score = 0;
    score += countAIPatterns(text) * 2;
    score += sentenceVarianceScore(text);

    var contractions = (text.match(/\b\w+'\w+\b/g) || []).length;
    if (wc(text) > 80 && contractions === 0) score += 4;
    score -= Math.min(contractions, 4);

    var longCount = splitSentences(text).filter(function (s) { return wc(s) > 30; }).length;
    score += longCount * 2;

    var lower = text.toLowerCase();
    score -= countTermHits(lower, ['hey', 'yeah', 'gonna', 'gotta', 'btw']) * 2;

    return Math.max(0, score);
  }

  function rewrite(text, options) {
    if (!text || !text.trim()) return text || '';

    var opts = options || {};
    var level = opts.level || 'medium';
    var context = opts.context || 'auto';

    if (context === 'auto') context = detectTone(text);

    var strength;
    if (level === 'light') strength = 0.35;
    else if (level === 'aggressive') strength = 0.92;
    else strength = 0.65;

    var cleaned = normalizeWhitespace(text);
    var score = scoreAIness(cleaned);
    var patterns = countAIPatterns(cleaned);

    if (level === 'light' && score < SCORE_THRESHOLD_HUMAN && patterns === 0) {
      return polish(applyContractions(cleaned, 0.4));
    }

    var paragraphs = splitParagraphs(cleaned);
    var outParagraphs = [];
    var i;

    for (i = 0; i < paragraphs.length; i++) {
      var para = paragraphs[i].trim();
      if (!para) continue;
      outParagraphs.push(rewriteParagraph(para, context, strength));
    }

    var result = outParagraphs.join('\n\n');

    if (context === 'email') {
      if (!/^(?:Hi|Hello|Hey),?/i.test(result)) {
        result = 'Hi, ' + lcFirst(result);
      }
      if (!/(thanks,|thank you,|best,|regards,)/i.test(result)) {
        result += '\n\nThanks,';
      }
    }

    return polish(result);
  }

  return {
    rewrite: rewrite,
    detectTone: detectTone,
    scoreAIness: scoreAIness,
    countAIPatterns: countAIPatterns,
    SCORE_THRESHOLD_HUMAN: SCORE_THRESHOLD_HUMAN,
    SCORE_THRESHOLD_AI: SCORE_THRESHOLD_AI
  };
});
