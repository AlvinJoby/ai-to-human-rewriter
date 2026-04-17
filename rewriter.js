/**
 * AI-to-Human Text Rewriter — v2.0
 *
 * A dramatically aggressive, multi-stage text transformation engine that
 * converts AI-generated content into natural, human-sounding prose.
 *
 * Pure ES5, zero dependencies. Works in Node.js (CommonJS) and browsers
 * (exposes global `Rewriter`).
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

  /* ===================================================================
   *  CONSTANTS
   * =================================================================*/

  var SCORE_THRESHOLD_HUMAN = 5;
  var SCORE_THRESHOLD_AI    = 15;

  /* ===================================================================
   *  HELPERS
   * =================================================================*/

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function chance(p) { return Math.random() < p; }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function ucFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function lcFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function wc(t) { var m = t.match(/\S+/g); return m ? m.length : 0; }

  function splitSentences(text) {
    var out = [];
    var buf = '';
    for (var i = 0; i < text.length; i++) {
      buf += text[i];
      if (/[.!?]/.test(text[i])) {
        var next = text[i + 1] || '';
        if (next === '' || /\s/.test(next)) {
          var lastWord = buf.replace(/[.!?]+$/, '').split(/\s/).pop() || '';
          if (lastWord.length > 2 || next === '' || /[A-Z]/.test(text[i + 2] || '')) {
            out.push(buf.trim());
            buf = '';
            while (i + 1 < text.length && /\s/.test(text[i + 1]) && text[i + 1] !== '\n') i++;
          }
        }
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out.filter(function (s) { return s.length > 0; });
  }

  /* ===================================================================
   *  PATTERN LIBRARY — 100+ patterns
   * =================================================================*/

  // ------------------------------------------------------------------
  //  1. Formal greeting / closing phrase replacements
  // ------------------------------------------------------------------
  var GREETING_PHRASES = [
    [/I hope this (?:message|email) finds you(?: well| in good (?:health|spirits|form))?[.,;:!\s]*/gi,
      ['Hey! ', 'Hi there! ', 'Hey — ']],
    [/I trust this (?:message|email|letter) finds you (?:well|in good health)[.,;!\s]*/gi,
      ['Hey! ', 'Hi! ', 'Hope you\'re doing well! ']],
    [/Dear Sir(?:\s*(?:\/|or)\s*Madam)?[.,;!\s]*/gi, ['Hi, ', 'Hello, ', 'Hey, ']],
    [/Dear (?:Mr|Mrs|Ms|Dr|Prof)\.?\s+\w+[.,;!\s]*/gi, ['Hi, ', 'Hey, ']],
    [/Greetings[.,;!\s]*/gi, ['Hey! ', 'Hi! ']],
    [/Good (?:morning|afternoon|evening)[.,;!\s]*/gi, ['Hey! ', 'Hi! ']],
    [/To whom it may concern[.,;!\s]*/gi, ['Hi there, ', 'Hey, ']],
    [/I am writing to inform you(?: that)?\s*/gi, ['Just wanted to let you know — ', 'Heads up: ', 'So — ']],
    [/I am writing to (?:express|convey|communicate)\s*/gi, ['I wanted to share ', 'Just wanted to say ']],
    [/I am writing in (?:response|reply|regard) to\s*/gi, ['About ', 'Regarding ']],
    [/Please be advised(?: that)?\s*/gi, ['Just so you know, ', 'Heads up — ']],
    [/I would like to (?:take this opportunity to )?bring to your attention(?: that)?\s*/gi,
      ['Just wanted to flag — ', 'Quick heads-up: ']],
    [/As per (?:our|your|the) (?:previous |earlier |last )?(?:conversation|discussion|email|message)[.,;!\s]*\s*/gi,
      ['Like we talked about, ', 'Going back to our chat, ', 'Following up on that — ']],
    [/Please do not hesitate to\s*/gi, ['Feel free to ', 'Just ']],
    [/At your earliest convenience/gi, ['when you get a chance', 'whenever works for you']],
    [/Please find (?:attached|enclosed)\s*/gi, ['I\'ve attached ', 'Here\'s ', 'Attached is ']],
    [/I look forward to hearing from you[.,;!\s]*/gi,
      ['Let me know what you think!', 'Talk soon!', 'Shoot me a reply when you can.']],
    [/I look forward to (?:your|our|the) (?:response|reply|feedback|cooperation)[.,;!\s]*/gi,
      ['Let me know!', 'Looking forward to it!']],
    [/Thank you for your (?:consideration|time|attention|patience)[.,;!\s]*/gi,
      ['Thanks!', 'Appreciate it!', 'Cheers!']],
    [/Thank you (?:very much|kindly|so much|in advance)[.,;!\s]*/gi, ['Thanks!', 'Thanks a lot!']],
    [/(?:Best|Kind|Warm) regards[.,;!\s]*/gi, ['Cheers,', 'Thanks,', 'Talk soon,']],
    [/Sincerely(?:\s+yours)?[.,;!\s]*/gi, ['Thanks,', 'Cheers,']],
    [/Respectfully(?:\s+yours)?[.,;!\s]*/gi, ['Thanks,', 'Cheers,']],
    [/With (?:kind|warm|best) (?:regards|wishes)[.,;!\s]*/gi, ['Thanks,', 'Cheers,']],
    [/Yours (?:truly|faithfully|sincerely)[.,;!\s]*/gi, ['Thanks,', 'Cheers,']],
  ];

  // ------------------------------------------------------------------
  //  2. Formal structure / summary phrases
  // ------------------------------------------------------------------
  var STRUCTURE_PHRASES = [
    [/To summarize[.,;]?\s*/gi, ['So basically, ', 'Long story short, ', 'Bottom line — ']],
    [/In summary[.,;]?\s*/gi, ['So basically, ', 'TL;DR — ']],
    [/In conclusion[.,;]?\s*/gi, ['So yeah, ', 'All in all, ', 'At the end of the day, ']],
    [/To conclude[.,;]?\s*/gi, ['Wrapping up — ', 'So yeah, ']],
    [/In closing[.,;]?\s*/gi, ['So, ', 'Anyway, ']],
    [/It is imperative(?: that)?\s*/gi, ['We really need to make sure ', 'It\'s critical that ']],
    [/It is crucial(?: that)?\s*/gi, ['It\'s really important that ', 'We gotta make sure ']],
    [/It is essential(?: that)?\s*/gi, ['We need to ', 'The key thing is ']],
    [/It is vital(?: that)?\s*/gi, ['It\'s super important that ', 'We need to ']],
    [/It is necessary(?: that| to| for)?\s*/gi, ['We need to ', 'You gotta ']],
    [/It is important to note(?: that)?\s*/gi, ['Worth mentioning — ', 'One thing to keep in mind: ']],
    [/It is worth noting(?: that)?\s*/gi, ['Good to know — ', 'Also — ']],
    [/It is worth mentioning(?: that)?\s*/gi, ['Also worth saying — ', 'Side note: ']],
    [/It should be noted(?: that)?\s*/gi, ['Just a note — ', 'Keep in mind, ']],
    [/It must be (?:noted|emphasized|stressed)(?: that)?\s*/gi, ['Big thing here — ', 'Key point: ']],
    [/It is evident(?: that)?\s*/gi, ['Clearly, ', 'Obviously, ']],
    [/It is clear(?: that)?\s*/gi, ['Obviously, ', 'It\'s pretty clear ']],
    [/It is apparent(?: that)?\s*/gi, ['Looks like ', 'You can see that ']],
    [/It goes without saying(?: that)?\s*/gi, ['Obviously, ', 'Look, ']],
    [/Needless to say[.,;]?\s*/gi, ['Obviously, ', 'I mean, ']],
    [/It is widely (?:acknowledged|recognized|known)(?: that)?\s*/gi,
      ['Everyone knows ', 'It\'s pretty well known that ']],
    [/It is (?:generally|commonly) (?:accepted|believed|understood)(?: that)?\s*/gi,
      ['Most people agree ', 'The general take is ']],
    [/(?:The fact of the matter is|The reality is)(?: that)?\s*/gi,
      ['Truth is, ', 'The thing is, ', 'Honestly, ']],
    [/(?:It is|It has become) increasingly (?:clear|apparent|evident|obvious)(?: that)?\s*/gi,
      ['More and more, it\'s clear that ', 'It\'s getting obvious that ']],
    [/In today'?s (?:fast[- ]paced|rapidly (?:changing|evolving)|modern|digital) (?:world|landscape|environment|era)[.,;]?\s*/gi,
      ['These days, ', 'Right now, ', 'With everything changing so fast, ']],
    [/In (?:this|the) (?:day and age|modern era|current landscape)[.,;]?\s*/gi,
      ['Nowadays, ', 'These days, ']],
  ];

  // ------------------------------------------------------------------
  //  3. Passive voice phrases
  // ------------------------------------------------------------------
  var PASSIVE_PHRASES = [
    [/It can be observed(?: that)?\s*/gi, ['You can see ', 'Looks like ']],
    [/It has been determined(?: that)?\s*/gi, ['Turns out ', 'We found that ']],
    [/It was (?:found|discovered)(?: that)?\s*/gi, ['We found that ', 'Turns out ']],
    [/It is recommended(?: that)?\s*/gi, ['I\'d suggest ', 'You should probably ']],
    [/It has been shown(?: that)?\s*/gi, ['Research shows ', 'We know that ']],
    [/It has been (?:demonstrated|proven)(?: that)?\s*/gi, ['It turns out ', 'Studies show ']],
    [/It (?:should|must|ought to) be (?:mentioned|pointed out|emphasized)(?: that)?\s*/gi,
      ['Worth pointing out — ', 'Gotta say — ']],
    [/It is (?:anticipated|expected)(?: that)?\s*/gi, ['We\'re expecting ', 'Looks like ']],
    [/It is (?:believed|thought)(?: that)?\s*/gi, ['People think ', 'The idea is ']],
    [/It (?:has been|was) (?:reported|noted|observed)(?: that)?\s*/gi,
      ['From what we\'ve seen, ', 'Reports say ']],
    [/(?:has|have) been (?:identified|recognized) as\b/gi, ['turns out to be', 'is basically']],
  ];

  // ------------------------------------------------------------------
  //  4. Overly polite / formal
  // ------------------------------------------------------------------
  var POLITE_PHRASES = [
    [/\bKindly\b/gi, 'Please'],
    [/I trust(?: that)?\s+/gi, ['I think ', 'I believe ']],
    [/I (?:would like to|wish to|want to) (?:express|convey) my\s*/gi, ['I want to share my ']],
    [/I (?:would like to|wish to) take a moment to\s*/gi, ['I want to ']],
    [/I (?:would like to|wish to) (?:emphasize|highlight|underscore)(?: that)?\s*/gi,
      ['I want to stress that ', 'Big thing here: ']],
    [/I (?:would like to|wish to) (?:reiterate|restate)(?: that)?\s*/gi,
      ['Again, ', 'Just to repeat — ']],
    [/allow me to\s*/gi, ['let me ']],
    [/permit me to\s*/gi, ['let me ']],
    [/I would be (?:grateful|thankful|appreciative) if\s*/gi, ['I\'d really appreciate it if ']],
    [/(?:your |the )?(?:esteemed|valued|respected) (?:organization|institution|company|team)/gi,
      ['your team', 'your company', 'you all']],
    [/I (?:am pleased|am happy|am delighted) to (?:inform|announce|share)(?: that)?\s*/gi,
      ['Great news — ', 'So, good news: ']],
    [/We are pleased to (?:inform|announce|share)(?: that)?\s*/gi,
      ['Good news — ', 'Happy to share: ']],
    [/Please (?:accept my|accept our) (?:sincere |heartfelt )?(?:apologies|gratitude)\s*/gi,
      ['Sorry about that ', 'Really appreciate it ']],
  ];

  // ------------------------------------------------------------------
  //  5. Transition patterns
  // ------------------------------------------------------------------
  var TRANSITION_PATTERNS = [
    [/\bFurthermore[.,;]?\s*/gi, ['Also, ', 'Plus, ', 'And ']],
    [/\bMoreover[.,;]?\s*/gi, ['Also, ', 'On top of that, ', 'Plus, ']],
    [/\bAdditionally[.,;]?\s*/gi, ['Also, ', 'And, ', 'Plus, ']],
    [/\bNevertheless[.,;]?\s*/gi, ['Still, ', 'But, ', 'Even so, ']],
    [/\bNonetheless[.,;]?\s*/gi, ['Still, ', 'But, ', 'Even so, ']],
    [/\bConversely[.,;]?\s*/gi, ['On the flip side, ', 'But then again, ']],
    [/\bConsequently[.,;]?\s*/gi, ['So, ', 'Because of that, ']],
    [/\bSubsequently[.,;]?\s*/gi, ['Then, ', 'After that, ']],
    [/\bHenceforth[.,;]?\s*/gi, ['From now on, ', 'Going forward, ']],
    [/\bIn addition[.,;]?\s*/gi, ['Also, ', 'Plus, ']],
    [/\bOn the other hand[.,;]?\s*/gi, ['But, ', 'Then again, ']],
    [/\bIn contrast[.,;]?\s*/gi, ['But, ', 'On the flip side, ']],
    [/\bAs a result[.,;]?\s*/gi, ['So, ', 'Because of that, ']],
    [/\bIn light of (?:this|that|these)[.,;]?\s*/gi, ['Given that, ', 'So, ']],
    [/\bWith that (?:being |having been )?said[.,;]?\s*/gi, ['That said, ', 'Anyway, ']],
    [/\bIn summary[.,;]?\s*/gi, ['So basically, ', 'TL;DR: ']],
    [/\bIn essence[.,;]?\s*/gi, ['Basically, ', 'At its core, ']],
    [/\bSpecifically[.,;]?\s*/gi, ['Like, ', 'For example, ']],
    [/\bNotably[.,;]?\s*/gi, ['Especially, ', 'Worth noting — ']],
    [/\bUltimately[.,;]?\s*/gi, ['At the end of the day, ', 'In the end, ']],
    [/\bAccordingly[.,;]?\s*/gi, ['So, ', 'Because of that, ']],
    [/\bThus[.,;]?\s*/gi, ['So, ', 'That means ']],
    [/\bHence[.,;]?\s*/gi, ['So, ', 'That\'s why ']],
    [/\bTherefore[.,;]?\s*/gi, ['So, ', 'That\'s why ']],
    [/\bNotwithstanding[.,;]?\s*/gi, ['Despite that, ', 'Even with that, ']],
    [/\bInasmuch as\b/gi, ['since', 'because']],
    [/\bIn order to\b/gi, ['to']],
    [/\bDue to the fact that\b/gi, ['because', 'since']],
    [/\bOwing to the fact that\b/gi, ['because', 'since']],
    [/\bFor the purpose of\b/gi, ['to', 'for']],
    [/\bIn the event that\b/gi, ['if']],
    [/\bPrior to\b/gi, ['before']],
    [/\bSubsequent to\b/gi, ['after']],
    [/\bIn regard(?:s)? to\b/gi, ['about']],
    [/\bWith respect to\b/gi, ['about']],
    [/\bWith regard(?:s)? to\b/gi, ['about']],
    [/\bPertaining to\b/gi, ['about']],
    [/\bIn accordance with\b/gi, ['following', 'per']],
    [/\bIn (?:the )?midst of\b/gi, ['during', 'while']],
    [/\bIn (?:the )?absence of\b/gi, ['without']],
    [/\bFor the sake of\b/gi, ['for']],
    [/\bBy virtue of\b/gi, ['because of', 'thanks to']],
    [/\bOn the basis of\b/gi, ['based on']],
    [/\bWith a view to\b/gi, ['to', 'aiming to']],
    [/\bIn the context of\b/gi, ['with', 'in']],
    [/\bIn the realm of\b/gi, ['in']],
    [/\bIn terms of\b/gi, ['for', 'regarding']],
    [/\bAs a matter of fact[.,;]?\s*/gi, ['Actually, ', 'In fact, ']],
    [/\bBy and large[.,;]?\s*/gi, ['Mostly, ', 'Generally, ']],
    [/\bAll things considered[.,;]?\s*/gi, ['Overall, ', 'When you think about it, ']],
    [/\bThat being said[.,;]?\s*/gi, ['That said, ', 'But, ']],
    [/\bHaving said that[.,;]?\s*/gi, ['That said, ', 'But still, ']],
    [/\bFirst and foremost[.,;]?\s*/gi, ['First off, ', 'Most importantly, ']],
    [/\bLast but not least[.,;]?\s*/gi, ['And finally, ', 'One more thing — ']],
    [/\bIt is worth emphasizing(?: that)?\s*/gi, ['Big point here: ', 'Key thing — ']],
    [/\bFor (?:all )?intents and purposes[.,;]?\s*/gi, ['Basically, ', 'Effectively, ']],
  ];

  // ------------------------------------------------------------------
  //  6. AI Buzzword -> plain-language replacements
  // ------------------------------------------------------------------
  var BUZZWORD_PATTERNS = [
    [/\butiliz(?:e|es|ed|ing)\b/gi, function (m) {
      var map = { 'utilize': 'use', 'utilizes': 'uses', 'utilized': 'used', 'utilizing': 'using' };
      return map[m.toLowerCase()] || 'use';
    }],
    [/\bleverag(?:e|es|ed|ing)\b/gi, function (m) {
      var map = { 'leverage': 'use', 'leverages': 'uses', 'leveraged': 'used', 'leveraging': 'using' };
      return map[m.toLowerCase()] || 'use';
    }],
    [/\bfacilitat(?:e|es|ed|ing)\b/gi, function (m) {
      var map = { 'facilitate': 'help with', 'facilitates': 'helps with', 'facilitated': 'helped with', 'facilitating': 'helping with' };
      return map[m.toLowerCase()] || 'help with';
    }],
    [/\bimplement(?:s|ed|ing|ation|ations)?\b/gi, function (m) {
      var l = m.toLowerCase();
      if (l === 'implementation' || l === 'implementations') return pick(['setup', 'rollout', 'build']);
      if (l === 'implementing') return 'building';
      if (l === 'implemented') return 'built';
      if (l === 'implements') return 'builds';
      return pick(['build', 'set up', 'put in place']);
    }],
    [/\boptimiz(?:e|es|ed|ing|ation|ations)\b/gi, function (m) {
      var l = m.toLowerCase();
      if (/ation/.test(l)) return pick(['improvement', 'tuning', 'speedup']);
      if (l === 'optimizing') return 'improving';
      if (l === 'optimized') return 'improved';
      if (l === 'optimizes') return 'improves';
      return pick(['improve', 'speed up', 'fine-tune']);
    }],
    [/\bstreamlin(?:e|es|ed|ing)\b/gi, function (m) {
      var l = m.toLowerCase();
      if (l === 'streamlining') return 'simplifying';
      if (l === 'streamlined') return 'simplified';
      if (l === 'streamlines') return 'simplifies';
      return pick(['simplify', 'clean up', 'make easier']);
    }],
    [/\bseamless(?:ly)?\b/gi, function (m) {
      return /ly$/i.test(m) ? 'smoothly' : pick(['smooth', 'easy', 'clean']);
    }],
    [/\bensur(?:e|es|ed|ing)\b/gi, function (m) {
      var map = { 'ensure': 'make sure', 'ensures': 'makes sure', 'ensured': 'made sure', 'ensuring': 'making sure' };
      return map[m.toLowerCase()] || 'make sure';
    }],
    [/\bdelv(?:e|es|ed|ing)\b/gi, function (m) {
      var map = { 'delve': 'dig into', 'delves': 'digs into', 'delved': 'dug into', 'delving': 'digging into' };
      return map[m.toLowerCase()] || 'dig into';
    }],
    [/\bembark(?:s|ed|ing)?\b/gi, function (m) {
      var l = m.toLowerCase();
      if (l === 'embarking') return 'starting';
      if (l === 'embarked') return 'started';
      if (l === 'embarks') return 'starts';
      return pick(['start', 'begin', 'kick off']);
    }],
    [/\bcommenc(?:e|es|ed|ing)\b/gi, function (m) {
      var l = m.toLowerCase();
      if (l === 'commencing') return 'starting';
      if (l === 'commenced') return 'started';
      if (l === 'commences') return 'starts';
      return pick(['start', 'begin', 'kick off']);
    }],
    [/\bascertain(?:s|ed|ing)?\b/gi, function (m) {
      var l = m.toLowerCase();
      if (l === 'ascertaining') return 'figuring out';
      if (l === 'ascertained') return 'figured out';
      return pick(['find out', 'figure out', 'learn']);
    }],
    [/\belucidat(?:e|es|ed|ing)\b/gi, function () { return pick(['explain', 'clarify', 'spell out']); }],
    [/\bameliorat(?:e|es|ed|ing)\b/gi, function () { return pick(['improve', 'fix', 'make better']); }],
    [/\bexpedit(?:e|es|ed|ing)\b/gi, function () { return pick(['speed up', 'fast-track', 'rush']); }],
    [/\baugment(?:s|ed|ing)?\b/gi, function () { return pick(['add to', 'boost', 'expand']); }],
    [/\bmitigat(?:e|es|ed|ing)\b/gi, function () { return pick(['reduce', 'lessen', 'cut down on']); }],
    [/\bpropagat(?:e|es|ed|ing)\b/gi, function () { return pick(['spread', 'share', 'pass along']); }],
    [/\bexemplif(?:y|ies|ied|ying)\b/gi, function () { return pick(['show', 'demonstrate', 'illustrate']); }],
    [/\bdemonstrat(?:e|es|ed|ing)\b/gi, function () { return pick(['show', 'prove', 'highlight']); }],
    [/\bencompass(?:es|ed|ing)?\b/gi, function () { return pick(['include', 'cover', 'span']); }],
    [/\bconstitut(?:e|es|ed|ing)\b/gi, function () { return pick(['make up', 'form', 'is']); }],
    [/\bperpetuate(?:s|d)?\b/gi, function () { return pick(['keep going', 'continue', 'maintain']); }],
    [/\bexacerbat(?:e|es|ed|ing)\b/gi, function () { return pick(['make worse', 'worsen', 'aggravate']); }],
    [/\bdelineat(?:e|es|ed|ing)\b/gi, function () { return pick(['outline', 'describe', 'lay out']); }],
    [/\barticul(?:ate|ates|ated|ating)\b/gi, function () { return pick(['express', 'say', 'describe']); }],
    [/\bcultivat(?:e|es|ed|ing)\b/gi, function () { return pick(['build', 'grow', 'develop']); }],
    [/\bbolster(?:s|ed|ing)?\b/gi, function () { return pick(['support', 'strengthen', 'boost']); }],
    [/\bfoster(?:s|ed|ing)?\b/gi, function () { return pick(['encourage', 'support', 'build']); }],
    [/\bgarner(?:s|ed|ing)?\b/gi, function () { return pick(['get', 'earn', 'win']); }],
    [/\bprocur(?:e|es|ed|ing)\b/gi, function () { return pick(['get', 'buy', 'obtain']); }],
    [/\bdisseminat(?:e|es|ed|ing)\b/gi, function () { return pick(['share', 'spread', 'distribute']); }],
    [/\bspearhead(?:s|ed|ing)?\b/gi, function () { return pick(['lead', 'run', 'drive']); }],
    [/\borchestrat(?:e|es|ed|ing)\b/gi, function () { return pick(['organize', 'coordinate', 'manage']); }],

    // adjective / noun buzzwords
    [/\brobust\b/gi, function () { return pick(['strong', 'solid', 'reliable']); }],
    [/\bcomprehensive\b/gi, function () { return pick(['complete', 'full', 'thorough']); }],
    [/\bholistic(?:ally)?\b/gi, function (m) {
      return /ally$/i.test(m) ? 'overall' : pick(['overall', 'big-picture', 'whole']);
    }],
    [/\bsynerg(?:y|ies|istic|istically)\b/gi, function () { return pick(['teamwork', 'combo', 'working together']); }],
    [/\bparadigm(?:s|atic)?\b/gi, function () { return pick(['model', 'approach', 'way of thinking']); }],
    [/\bpivotal\b/gi, function () { return pick(['key', 'critical', 'major']); }],
    [/\binnovati(?:ve|on|ons|vely)\b/gi, function () { return pick(['new', 'creative', 'fresh']); }],
    [/\bcutting[- ]edge\b/gi, function () { return pick(['latest', 'newest', 'modern']); }],
    [/\bstate[- ]of[- ]the[- ]art\b/gi, function () { return pick(['top-notch', 'best available', 'modern']); }],
    [/\bgame[- ]chang(?:er|ers|ing)\b/gi, function () { return pick(['big deal', 'breakthrough', 'huge shift']); }],
    [/\bgroundbreaking\b/gi, function () { return pick(['major', 'breakthrough', 'big']); }],
    [/\brevolutionar(?:y|ize|ized|izing)\b/gi, function () { return pick(['transform', 'shake up', 'change']); }],
    [/\bunparalleled\b/gi, function () { return pick(['unmatched', 'top-tier', 'best']); }],
    [/\bmeticulous(?:ly)?\b/gi, function (m) {
      return /ly$/i.test(m) ? 'carefully' : pick(['careful', 'thorough', 'detailed']);
    }],
    [/\bplethora\b/gi, function () { return pick(['ton', 'bunch', 'lot']); }],
    [/\bmyriad(?:s)?\b/gi, function () { return pick(['tons of', 'a bunch of', 'loads of']); }],
    [/\bmultifaceted\b/gi, function () { return pick(['complex', 'many-sided', 'varied']); }],
    [/\bparamount\b/gi, function () { return pick(['top priority', 'critical', 'vital']); }],
    [/\bendeavor(?:s)?\b/gi, function () { return pick(['effort', 'project', 'attempt']); }],
    [/\bproficient(?:ly)?\b/gi, function () { return pick(['skilled', 'good at', 'experienced']); }],
    [/\bsubsequently\b/gi, function () { return pick(['then', 'after that', 'later']); }],
    [/\baforementioned\b/gi, function () { return pick(['earlier', 'that', 'the one I mentioned']); }],
    [/\bhenceforth\b/gi, function () { return pick(['from now on', 'going forward']); }],
    [/\bthereby\b/gi, function () { return pick(['so', 'which means']); }],
    [/\bwherein\b/gi, 'where'],
    [/\bthereof\b/gi, function () { return pick(['of that', 'of it']); }],
    [/\btherein\b/gi, function () { return pick(['in that', 'in there']); }],
    [/\bsubstantial(?:ly)?\b/gi, function (m) {
      return /ly$/i.test(m) ? pick(['a lot', 'really', 'significantly']) : pick(['big', 'major', 'serious']);
    }],
    [/\bsignificant(?:ly)?\b/gi, function (m) {
      return /ly$/i.test(m) ? pick(['a lot', 'really', 'noticeably']) : pick(['big', 'major', 'real']);
    }],
    [/\bnumerous\b/gi, function () { return pick(['many', 'lots of', 'a bunch of']); }],
    [/\bsufficient(?:ly)?\b/gi, function () { return pick(['enough', 'plenty of']); }],
    [/\bexceedingly\b/gi, function () { return pick(['really', 'super', 'extremely']); }],
    [/\bnoteworthy\b/gi, function () { return pick(['notable', 'interesting', 'worth a look']); }],
    [/\bundertake(?:s|n)?\b/gi, function () { return pick(['take on', 'do', 'start']); }],
    [/\bundertaking(?:s)?\b/gi, function () { return pick(['project', 'effort', 'task']); }],
    [/\bpertinent\b/gi, function () { return pick(['relevant', 'important', 'related']); }],
    [/\bintrinsic(?:ally)?\b/gi, function () { return pick(['built-in', 'natural', 'core']); }],
    [/\bextrinsic(?:ally)?\b/gi, function () { return pick(['external', 'outside']); }],
    [/\bdichotomy\b/gi, function () { return pick(['split', 'divide', 'contrast']); }],
    [/\bpropensity\b/gi, function () { return pick(['tendency', 'habit', 'lean towards']); }],
    [/\bpredilection\b/gi, function () { return pick(['preference', 'liking']); }],
    [/\bproclivity\b/gi, function () { return pick(['tendency', 'inclination']); }],
    [/\bjuxtapos(?:e|es|ed|ing|ition)\b/gi, function () { return pick(['compare', 'contrast', 'put side by side']); }],
    [/\bexponential(?:ly)?\b/gi, function (m) {
      return /ly$/i.test(m) ? pick(['rapidly', 'really fast']) : pick(['rapid', 'huge', 'fast']);
    }],
    [/\bfundamental(?:ly)?\b/gi, function (m) {
      return /ly$/i.test(m) ? pick(['basically', 'at its core']) : pick(['basic', 'core', 'key']);
    }],
    [/\bnavigat(?:e|es|ed|ing)\b/gi, function () { return pick(['work through', 'handle', 'deal with']); }],
    [/\bempow(?:er|ers|ered|ering)\b/gi, function () { return pick(['help', 'enable', 'give power to']); }],
    [/\btransform(?:ative|ational)\b/gi, function () { return pick(['big', 'game-changing', 'major']); }],
    [/\bactionable\b/gi, function () { return pick(['practical', 'useful', 'something you can act on']); }],
    [/\bscalable\b/gi, function () { return pick(['grows with you', 'expandable', 'flexible']); }],
    [/\bsustainable\b/gi, function () { return pick(['lasting', 'long-term', 'maintainable']); }],
    [/\btangible\b/gi, function () { return pick(['real', 'concrete', 'actual']); }],
    [/\bintangible\b/gi, function () { return pick(['abstract', 'hard to pin down']); }],
    [/\bvisceral\b/gi, function () { return pick(['gut-level', 'deep', 'raw']); }],
    [/\bwhereupon\b/gi, function () { return pick(['and then', 'after which']); }],
    [/\bhitherto\b/gi, function () { return pick(['until now', 'so far']); }],
    [/\bheretofore\b/gi, function () { return pick(['until now', 'before this']); }],
    [/\binsofar as\b/gi, function () { return pick(['as far as', 'to the extent that']); }],
    [/\bnotwithstanding\b/gi, function () { return pick(['despite', 'even with']); }],
    [/\bwhilst\b/gi, 'while'],
    [/\bamongst\b/gi, 'among'],
    [/\bforthwith\b/gi, function () { return pick(['right away', 'immediately']); }],
    [/\b(?:a )?vast (?:array|majority|number) of\b/gi, function () { return pick(['a lot of', 'tons of', 'many']); }],
    [/\ba wide (?:range|variety|spectrum) of\b/gi, function () { return pick(['lots of different', 'many kinds of', 'all sorts of']); }],
    [/\bplay a (?:crucial|pivotal|vital|key|significant|important) role\b/gi,
      function () { return pick(['really matter', 'are a big deal', 'make a real difference']); }],
    [/\bhas the potential to\b/gi, function () { return pick(['could', 'might', 'can']); }],
    [/\bhas the capacity to\b/gi, function () { return pick(['can', 'is able to']); }],
    [/\bin a (?:timely|efficient|effective) manner\b/gi,
      function () { return pick(['quickly', 'well', 'fast']); }],
    [/\bon a (?:daily|regular|consistent) basis\b/gi,
      function () { return pick(['every day', 'regularly', 'all the time']); }],
    [/\bat the present time\b/gi, function () { return pick(['right now', 'currently']); }],
    [/\bat this juncture\b/gi, function () { return pick(['right now', 'at this point']); }],
    [/\bat this point in time\b/gi, function () { return pick(['right now', 'at this point']); }],
  ];

  // ------------------------------------------------------------------
  //  7. Contraction map
  // ------------------------------------------------------------------
  var CONTRACTION_MAP = {
    'I am': 'I\'m', 'I have': 'I\'ve', 'I will': 'I\'ll', 'I would': 'I\'d', 'I had': 'I\'d',
    'you are': 'you\'re', 'you have': 'you\'ve', 'you will': 'you\'ll', 'you would': 'you\'d',
    'he is': 'he\'s', 'he has': 'he\'s', 'he will': 'he\'ll', 'he would': 'he\'d',
    'she is': 'she\'s', 'she has': 'she\'s', 'she will': 'she\'ll', 'she would': 'she\'d',
    'it is': 'it\'s', 'it has': 'it\'s', 'it will': 'it\'ll', 'it would': 'it\'d',
    'we are': 'we\'re', 'we have': 'we\'ve', 'we will': 'we\'ll', 'we would': 'we\'d',
    'they are': 'they\'re', 'they have': 'they\'ve', 'they will': 'they\'ll', 'they would': 'they\'d',
    'that is': 'that\'s', 'that has': 'that\'s', 'that will': 'that\'ll', 'that would': 'that\'d',
    'what is': 'what\'s', 'what has': 'what\'s', 'what will': 'what\'ll',
    'who is': 'who\'s', 'who has': 'who\'s', 'who will': 'who\'ll',
    'where is': 'where\'s', 'where has': 'where\'s',
    'when is': 'when\'s', 'when has': 'when\'s',
    'why is': 'why\'s',
    'how is': 'how\'s', 'how has': 'how\'s',
    'there is': 'there\'s', 'there has': 'there\'s', 'there will': 'there\'ll',
    'here is': 'here\'s',
    'do not': 'don\'t', 'does not': 'doesn\'t', 'did not': 'didn\'t',
    'is not': 'isn\'t', 'are not': 'aren\'t',
    'was not': 'wasn\'t', 'were not': 'weren\'t',
    'have not': 'haven\'t', 'has not': 'hasn\'t', 'had not': 'hadn\'t',
    'will not': 'won\'t', 'would not': 'wouldn\'t',
    'could not': 'couldn\'t', 'should not': 'shouldn\'t',
    'can not': 'can\'t', 'cannot': 'can\'t',
    'might not': 'mightn\'t', 'must not': 'mustn\'t', 'need not': 'needn\'t',
    'let us': 'let\'s'
  };

  // ------------------------------------------------------------------
  //  8. Human voice injection lists
  // ------------------------------------------------------------------
  var CONV_STARTERS = [
    'Honestly, ', 'Basically, ', 'Look, ', 'To be fair, ',
    'Truth is, ', 'I mean, ', 'So yeah, ', 'The thing is, ',
    'Actually, ', 'Really though, ', 'Point is, ', 'Bottom line, ',
    'Frankly, ', 'Just saying — ', 'For real though, ', 'Real talk, '
  ];

  var THINKING_PAUSES = [
    'So basically... ', 'I mean... ', 'Look... ',
    'Thing is... ', 'Well... ', 'Hmm, ', 'Okay so... '
  ];

  var CASUAL_QUESTIONS = [
    ' Right?', ' You know?', ' Make sense?',
    ' See what I mean?', ' Get it?', ' Fair enough?'
  ];

  var PERSONAL_TOUCHES = [
    'I think ', 'I\'d say ', 'honestly ', 'frankly ',
    'in my experience ', 'from what I\'ve seen '
  ];

  // Combined pattern array for scoring/counting
  var ALL_PHRASE_PATTERNS = [].concat(GREETING_PHRASES, STRUCTURE_PHRASES, PASSIVE_PHRASES, POLITE_PHRASES);
  var ALL_PATTERNS = [].concat(ALL_PHRASE_PATTERNS, TRANSITION_PATTERNS, BUZZWORD_PATTERNS);

  /* ===================================================================
   *  TONE DETECTION
   * =================================================================*/

  function detectTone(text) {
    if (!text) return 'casual';
    var lower = text.toLowerCase();

    var emailTerms = ['hi ', 'hello', 'dear ', 'greetings', 'subject:', 'regards',
      'sincerely', 'best regards', 'thank you', 'attached', 'meeting',
      'schedule', 'follow up', 'cc:', 'bcc:', 'forward', 'reply',
      'inbox', 're:', 'fwd:', 'recipient', 'sender', 'email'];
    var techTerms = ['api', 'function', 'database', 'server', 'deploy',
      'code', 'repository', 'endpoint', 'algorithm', 'framework',
      'compile', 'runtime', 'debug', 'syntax', 'module', 'class',
      'object', 'array', 'string', 'boolean', 'integer', 'null',
      'undefined', 'http', 'https', 'json', 'xml', 'html', 'css',
      'sql', 'query', 'schema', 'config', 'docker', 'kubernetes',
      'pipeline', 'ci/cd', 'git', 'branch', 'merge', 'commit',
      'refactor', 'unit test', 'integration', 'backend', 'frontend'];
    var proTerms = ['stakeholder', 'quarterly', 'revenue', 'kpi', 'roi',
      'strategy', 'deliverable', 'milestone', 'budget', 'objective',
      'initiative', 'compliance', 'governance', 'fiscal', 'board',
      'executive', 'management', 'performance', 'benchmark', 'assessment'];

    var emailScore = 0, techScore = 0, proScore = 0;
    var i;
    for (i = 0; i < emailTerms.length; i++) { if (lower.indexOf(emailTerms[i]) !== -1) emailScore++; }
    for (i = 0; i < techTerms.length; i++) { if (lower.indexOf(techTerms[i]) !== -1) techScore++; }
    for (i = 0; i < proTerms.length; i++) { if (lower.indexOf(proTerms[i]) !== -1) proScore++; }

    if (techScore >= 3) return 'technical';
    if (emailScore >= 3) return 'email';
    if (proScore >= 2) return 'professional';
    if (emailScore >= 2) return 'email';
    return 'casual';
  }

  /* ===================================================================
   *  AI-NESS SCORING
   * =================================================================*/

  function scoreAIness(text) {
    if (!text) return 0;
    var score = 0;
    var i, m;

    // +3 for each formal AI phrase
    for (i = 0; i < ALL_PHRASE_PATTERNS.length; i++) {
      ALL_PHRASE_PATTERNS[i][0].lastIndex = 0;
      m = text.match(ALL_PHRASE_PATTERNS[i][0]);
      if (m) score += 3 * m.length;
    }
    // +2 for each AI transition
    for (i = 0; i < TRANSITION_PATTERNS.length; i++) {
      TRANSITION_PATTERNS[i][0].lastIndex = 0;
      m = text.match(TRANSITION_PATTERNS[i][0]);
      if (m) score += 2 * m.length;
    }
    // +2 for each AI buzzword
    for (i = 0; i < BUZZWORD_PATTERNS.length; i++) {
      BUZZWORD_PATTERNS[i][0].lastIndex = 0;
      m = text.match(BUZZWORD_PATTERNS[i][0]);
      if (m) score += 2 * m.length;
    }

    // +5 if sentence-length variance is very low (uniform = AI signal)
    var sentences = splitSentences(text);
    if (sentences.length > 2) {
      var lens = [];
      for (i = 0; i < sentences.length; i++) lens.push(wc(sentences[i]));
      var avg = 0;
      for (i = 0; i < lens.length; i++) avg += lens[i];
      avg /= lens.length;
      var variance = 0;
      for (i = 0; i < lens.length; i++) variance += (lens[i] - avg) * (lens[i] - avg);
      variance /= lens.length;
      if (variance < 15) score += 5;
    }

    // +3 per very long paragraph (80+ words)
    var paragraphs = text.split(/\n\s*\n/);
    for (i = 0; i < paragraphs.length; i++) {
      if (wc(paragraphs[i]) > 80) score += 3;
    }

    // +2 for lack of contractions in long text
    if (text.length > 200 && !/\w'\w/.test(text)) {
      score += 2;
    }

    // -2 for each existing contraction found
    var contractionHits = (text.match(/\w'\w/g) || []).length;
    score -= contractionHits * 2;

    // -3 for casual language already present
    var casualTerms = ['yeah', 'hey', 'gonna', 'gotta', 'kinda', 'sorta',
      'wanna', 'lemme', 'tbh', 'lol', 'btw', 'imo', 'ngl', 'nah', 'yep', 'nope'];
    var lower = text.toLowerCase();
    for (i = 0; i < casualTerms.length; i++) {
      if (lower.indexOf(casualTerms[i]) !== -1) score -= 3;
    }

    return Math.max(score, 0);
  }

  /* ===================================================================
   *  PATTERN COUNTER
   * =================================================================*/

  function countAIPatterns(text) {
    if (!text) return 0;
    var count = 0;
    for (var i = 0; i < ALL_PATTERNS.length; i++) {
      ALL_PATTERNS[i][0].lastIndex = 0;
      var m = text.match(ALL_PATTERNS[i][0]);
      if (m) count += m.length;
    }
    return count;
  }

  /* ===================================================================
   *  STAGE 2 -- Aggressive AI Pattern Removal
   * =================================================================*/

  function replacePatterns(text, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      var re = patterns[i][0];
      var rep = patterns[i][1];
      re.lastIndex = 0;
      if (typeof rep === 'function') {
        text = text.replace(re, rep);
      } else if (Array.isArray(rep)) {
        text = text.replace(re, function (matched) {
          var chosen = pick(rep);
          // Preserve case: if matched started lowercase, lowercase the replacement
          if (/^[a-z]/.test(matched) && /^[A-Z]/.test(chosen)) {
            chosen = lcFirst(chosen);
          }
          return chosen;
        });
      } else {
        text = text.replace(re, function (matched) {
          var r = rep;
          if (/^[a-z]/.test(matched) && /^[A-Z]/.test(r)) {
            r = lcFirst(r);
          }
          return r;
        });
      }
    }
    return text;
  }

  /* ===================================================================
   *  STAGE 3 -- Sentence Restructuring
   * =================================================================*/

  function restructureSentences(sentences, agg) {
    var result = [];
    var splitThreshold = agg >= 0.65 ? 18 : (agg >= 0.4 ? 22 : 28);
    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i].trim();
      if (!s) continue;
      var words = wc(s);

      // Split very long sentences at natural break points
      if (words > splitThreshold && chance(Math.min(0.95, agg + 0.2))) {
        var splitRes = trySplit(s);
        if (splitRes) {
          for (var k = 0; k < splitRes.length; k++) result.push(splitRes[k]);
          continue;
        }
      }

      // Split medium-length dense sentences
      if (words > 16 && /,\s*(?:and|but|because|which|while|so)\s+/i.test(s) && chance(agg * 0.55)) {
        var mediumSentenceSplit = trySplit(s);
        if (mediumSentenceSplit) {
          for (var x = 0; x < mediumSentenceSplit.length; x++) result.push(mediumSentenceSplit[x]);
          continue;
        }
      }

      // Merge two short adjacent sentences
      if (words < 7 && i + 1 < sentences.length && wc(sentences[i + 1]) < 9 && chance(Math.max(0.2, agg * 0.5))) {
        var merged = s.replace(/[.!?]+$/, '') + ', ' + lcFirst(sentences[i + 1].trim());
        result.push(merged);
        i++;
        continue;
      }

      result.push(s);
    }
    return result;
  }

  function trySplit(s) {
    var connectors = [
      /,\s*(?:and|but|which|where|while|although|because|since|so|yet)\s+/i,
      /;\s*/,
      /\s+(?:however|but|although|while|whereas)\s+/i
    ];
    for (var i = 0; i < connectors.length; i++) {
      var idx = s.search(connectors[i]);
      if (idx > 10 && idx < s.length - 10) {
        var match = s.match(connectors[i]);
        if (!match) continue;
        var first = s.slice(0, idx).trim();
        var rest = s.slice(idx + match[0].length).trim();
        if (wc(first) < 5 || wc(rest) < 4) continue;
        if (!/[.!?]$/.test(first)) first += '.';
        return [first, ucFirst(rest)];
      }
    }
    // Try splitting on long comma-separated clauses
    var commaIdx = s.indexOf(', ');
    if (commaIdx > 15 && commaIdx < s.length - 15) {
      var p1 = s.slice(0, commaIdx).trim();
      var p2 = s.slice(commaIdx + 2).trim();
      if (wc(p1) >= 5 && wc(p2) >= 5) {
        if (!/[.!?]$/.test(p1)) p1 += '.';
        return [p1, ucFirst(p2)];
      }
    }
    return null;
  }

  function simulateHumanTypos(text, level, ctx) {
    if (!text || level === 'light') return text;

    // Keep typo frequency intentionally low so readability stays high.
    var typoChance = level === 'aggressive' ? 0.12 : 0.03;
    if (ctx === 'technical' || ctx === 'professional') typoChance *= 0.5;

    var maxTypos = level === 'aggressive' ? 2 : 1;
    // Deliberate misspellings used at low frequency to mimic natural human imperfections.
    var typoMap = {
      'really': 'realy',
      'because': 'becuase',
      'definitely': 'definately',
      'separate': 'seperate',
      'which': 'wich'
    };

    var applied = 0;
    for (var key in typoMap) {
      if (!typoMap.hasOwnProperty(key) || applied >= maxTypos) continue;
      var re = new RegExp('\\b' + escRe(key) + '\\b', 'gi');
      text = text.replace(re, function (matched) {
        if (applied >= maxTypos || !chance(typoChance)) return matched;
        applied++;
        var replacement = typoMap[key];
        return /^[A-Z]/.test(matched) ? ucFirst(replacement) : replacement;
      });
    }
    return text;
  }

  /* ===================================================================
   *  STAGE 4 -- Human Voice Injection
   * =================================================================*/

  function applyContractions(text, probability) {
    var keys = [];
    for (var p in CONTRACTION_MAP) {
      if (CONTRACTION_MAP.hasOwnProperty(p)) keys.push(p);
    }
    // Sort longest-first to avoid partial matches
    keys.sort(function (a, b) { return b.length - a.length; });

    for (var i = 0; i < keys.length; i++) {
      if (!chance(probability)) continue;
      var re = new RegExp('\\b' + escRe(keys[i]) + '\\b', 'gi');
      var val = CONTRACTION_MAP[keys[i]];
      text = text.replace(re, val);
    }
    return text;
  }

  function injectHumanVoice(sentences, ctx, agg) {
    var starterRate = ctx === 'technical' ? 0.08 : (ctx === 'professional' ? 0.12 : 0.22);
    var questionRate = ctx === 'technical' ? 0.03 : (ctx === 'professional' ? 0.05 : 0.12);
    var pauseRate = 0.06;
    var personalRate = ctx === 'technical' ? 0.05 : 0.12;
    var connectorRate = 0.08;

    // Scale by aggressiveness (normalize around medium=0.40)
    var scale = agg / 0.40;
    starterRate *= scale;
    questionRate *= scale;
    pauseRate *= scale;
    personalRate *= scale;
    connectorRate *= scale;

    var starters = CONV_STARTERS;
    var questions = CASUAL_QUESTIONS;
    var touches = PERSONAL_TOUCHES;

    if (ctx === 'technical') {
      starters = ['In practice, ', 'Quick note, ', 'To keep it clear, ', 'One thing to flag, '];
      questions = [' Make sense?', ' Sound good?', ' Does that track?'];
      touches = ['from what we\'ve seen, ', 'in our tests, ', 'in most cases, '];
    } else if (ctx === 'professional') {
      starters = ['To be clear, ', 'Just to align, ', 'One key point, ', 'From a business side, '];
      questions = [' Is that reasonable?', ' Does that align?', ' Fair point?'];
      touches = ['in my view, ', 'from my side, ', 'based on what we\'ve seen, '];
    } else if (ctx === 'email') {
      starters = ['Quick note, ', 'Just a heads up, ', 'By the way, ', 'One more thing, '];
      questions = [' Sound good?', ' Does that work for you?', ' Works for you?'];
      touches = ['from my side, ', 'I think ', 'honestly, '];
    }

    // Pattern to detect already-casual sentence starts
    var casualStartRe = /^(?:So|But|And|Also|Plus|Hey|Look|I mean|Honestly|Basically|Actually|Frankly|Heads up|Just|Hi|Hello|Good news|Great news|Quick|Turns out|Truth is|The thing is|Bottom line|TL;DR|Anyway|Cheers|Thanks)/i;
    var result = [];
    var lastInjection = -3; // track to avoid injecting too close together

    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i];
      var gap = i - lastInjection;
      var alreadyCasual = casualStartRe.test(s);
      var tooShort = wc(s) < 5;

      // Conversational starters -- not on first sentence, need gap
      if (i > 0 && gap >= 2 && !alreadyCasual && !tooShort && chance(starterRate)) {
        s = pick(starters) + lcFirst(s);
        lastInjection = i;
      }

      // Thinking pauses -- rarely, needs big gap, not on casual/short
      if (i > 1 && gap >= 4 && !alreadyCasual && !tooShort && chance(pauseRate)) {
        s = pick(THINKING_PAUSES) + lcFirst(s);
        lastInjection = i;
      }

      // Casual question at end of declarative sentence
      if (gap >= 3 && !tooShort && chance(questionRate) && /\.$/.test(s)) {
        s = s.replace(/\.$/, pick(questions));
        lastInjection = i;
      }

      // Personal touches -- not in technical writing, not on casual/short
      if (gap >= 3 && !alreadyCasual && !tooShort && chance(personalRate) && /^[A-Z]/.test(s)) {
        s = pick(touches) + lcFirst(s);
        lastInjection = i;
      }

      // Connector variety without using dash punctuation
      if (!tooShort && chance(connectorRate) && s.indexOf(',') !== -1) {
        s = s.replace(/,/, ':');
      }

      result.push(s);
    }
    return result;
  }

  /* ===================================================================
   *  STAGE 5 -- Context-Specific Adjustments
   * =================================================================*/

  function contextAdjust(text, ctx) {
    if (ctx === 'email') {
      text = text.replace(/^(?:Dear\b[^.!?\n]*[.,;]?\s*\n?)/i, '');
      if (!/^(?:Hey|Hi|Hello|Yo|What's up)/i.test(text.trim())) {
        text = pick(['Hey! ', 'Hi! ', 'Hey there, ']) + text.trim();
      }
      text = text.replace(/\bkindly\b/gi, 'please');
      text = text.replace(/\bat your earliest convenience\b/gi, 'when you get a chance');
    }
    if (ctx === 'casual') {
      text = text.replace(/\bvery\b/gi, function () { return pick(['super', 'really', 'pretty']); });
      text = text.replace(/\bquite\b/gi, function () { return pick(['pretty', 'really']); });
      text = text.replace(/\bhowever\b/gi, function () { return pick(['but', 'though']); });
      text = text.replace(/\btherefore\b/gi, 'so');
      text = text.replace(/\bmoreover\b/gi, 'also');
    }
    if (ctx === 'technical') {
      text = text.replace(/\bprior to deployment\b/gi, 'before we push this live');
      text = text.replace(/\bprior to (?:the )?release\b/gi, 'before release');
      text = text.replace(/\bthoroughly tested\b/gi, function () { return pick(['well-tested', 'solidly tested']); });
      text = text.replace(/\bproperly documented\b/gi, function () { return pick(['well-documented', 'documented properly']); });
      text = text.replace(/\bgotta\b/gi, 'need to');
      text = text.replace(/\bsuper\b/gi, 'very');
      text = text.replace(/\breal talk\b/gi, 'to be clear');
    }
    if (ctx === 'professional') {
      text = text.replace(/\bvery important\b/gi, function () { return pick(['really important', 'key']); });
      text = text.replace(/\bgotta\b/gi, 'need to');
      text = text.replace(/\bkinda\b/gi, 'somewhat');
      text = text.replace(/\bsorta\b/gi, 'somewhat');
      text = text.replace(/\breal talk\b/gi, 'to be direct');
    }
    return text;
  }

  /* ===================================================================
   *  STAGE 6 -- Final Polish
   * =================================================================*/

  function polish(text) {
    // Replace AI-like dash punctuation and then remove dash symbols entirely.
    text = text.replace(/\s*[—–]+\s*/g, ', ');
    text = text.replace(/\s-\s/g, ', ');
    text = text.replace(/\blet[’']s\b/gi, 'let us');
    text = text.replace(/\bit[’']s\b/gi, 'it is');
    text = text.replace(/\bthat[’']s\b/gi, 'that is');
    text = text.replace(/\bwhat[’']s\b/gi, 'what is');
    text = text.replace(/\bwho[’']s\b/gi, 'who is');
    text = text.replace(/\bthere[’']s\b/gi, 'there is');
    text = text.replace(/\bhere[’']s\b/gi, 'here is');
    text = text.replace(/\bwon[’']t\b/gi, 'will not');
    text = text.replace(/\bcan[’']t\b/gi, 'cannot');
    text = text.replace(/\b([A-Za-z]+)n[’']t\b/gi, '$1 not');
    text = text.replace(/\b([A-Za-z]+)[’']re\b/gi, '$1 are');
    text = text.replace(/\b([A-Za-z]+)[’']ve\b/gi, '$1 have');
    text = text.replace(/\b([A-Za-z]+)[’']ll\b/gi, '$1 will');
    text = text.replace(/\b([A-Za-z]+)[’']d\b/gi, '$1 would');
    text = text.replace(/\b([A-Za-z]+)[’']m\b/gi, '$1 am');
    text = text.replace(/\b(he|she|it|that|what|who|where|when|why|how|there|here)[’']s\b/gi, '$1 is');
    text = text.replace(/\b([A-Za-z]+)[’']s\b/gi, '$1 s');
    text = text.replace(/-/g, ' ');
    text = text.replace(/[’']/g, '');
    // Remove list-style bullets that often signal generated text structure
    text = text.replace(/^\s*[-*•]\s+/gm, '');
    text = text.replace(/ {2,}/g, ' ');
    text = text.replace(/\.{3,}/g, '...');
    text = text.replace(/\.\.(?!\.)/g, '.');
    text = text.replace(/\s+,/g, ',');
    text = text.replace(/ \./g, '.');
    text = text.replace(/,+/g, ',');
    text = text.replace(/!{2,}/g, '!');
    text = text.replace(/\?{2,}/g, '?');
    // Capitalize after sentence-ending punctuation
    text = text.replace(/([.!?])\s+([a-z])/g, function (_, p, ch) { return p + ' ' + ch.toUpperCase(); });
    // Capitalize start of text
    text = text.replace(/^\s*([a-z])/, function (_, ch) { return ch.toUpperCase(); });
    var lines = text.split('\n');
    var trimmed = [];
    for (var i = 0; i < lines.length; i++) trimmed.push(lines[i].trim());
    text = trimmed.join('\n');
    // Capitalize after newlines
    text = text.replace(/\n\s*([a-z])/g, function (_, ch) { return '\n' + ch.toUpperCase(); });
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/\s+([.!?,;:])/g, '$1');
    text = text.replace(/([,:;])(?=[A-Za-z])/g, '$1 ');
    return text.trim();
  }

  /* ===================================================================
   *  MAIN PIPELINE -- rewrite(text, options)
   * =================================================================*/

  function rewrite(text, options) {
    if (!text || text.trim().length === 0) return text || '';

    var opts = options || {};
    var ctx = opts.context || 'auto';
    var level = opts.level || 'medium';

    if (ctx === 'auto') ctx = detectTone(text);

    var agg;
    switch (level) {
      case 'light': agg = 0.15; break;
      case 'aggressive': agg = 0.70; break;
      default: agg = 0.40;
    }

    // Stage 1: detect — skip only if zero AI patterns and not aggressive
    var aiScore = scoreAIness(text);
    var patCount = countAIPatterns(text);
    if (aiScore < SCORE_THRESHOLD_HUMAN && patCount === 0 && level !== 'aggressive') {
      return applyContractions(text, 0.5);
    }
    // For low-score text with some patterns, still run pattern removal
    // but skip restructuring and voice injection unless score is high
    var skipVoice = (aiScore < SCORE_THRESHOLD_HUMAN && level === 'light');

    var paragraphs = text.split(/(\n\s*\n)/);
    var outParagraphs = [];

    for (var pi = 0; pi < paragraphs.length; pi++) {
      var para = paragraphs[pi];

      if (/^\s*$/.test(para)) {
        outParagraphs.push(para);
        continue;
      }

      // Stage 2: aggressive pattern removal
      para = replacePatterns(para, GREETING_PHRASES);
      para = replacePatterns(para, STRUCTURE_PHRASES);
      para = replacePatterns(para, PASSIVE_PHRASES);
      para = replacePatterns(para, POLITE_PHRASES);
      para = replacePatterns(para, TRANSITION_PATTERNS);
      para = replacePatterns(para, BUZZWORD_PATTERNS);

      // Stage 3: sentence restructuring (skip for light or skipVoice)
      var sentences = splitSentences(para);
      if (level !== 'light' && !skipVoice) {
        sentences = restructureSentences(sentences, agg);
      }

      // Stage 4: human voice injection (skip for light or skipVoice)
      if (level !== 'light' && !skipVoice) {
        sentences = injectHumanVoice(sentences, ctx, agg);
      }

      // Contractions
      var cProb = level === 'light' ? 0.50 : (level === 'aggressive' ? 0.95 : 0.80);
      para = sentences.join(' ');
      para = applyContractions(para, cProb);

      outParagraphs.push(para);
    }

    var out = outParagraphs.join('');

    // Stage 5: context adjustments
    out = contextAdjust(out, ctx);

    // Stage 5.5: tiny human-like imperfections
    out = simulateHumanTypos(out, level, ctx);

    // Stage 6: polish
    out = polish(out);

    return out;
  }

  /* ===================================================================
   *  PUBLIC API
   * =================================================================*/

  return {
    rewrite: rewrite,
    detectTone: detectTone,
    scoreAIness: scoreAIness,
    countAIPatterns: countAIPatterns,
    SCORE_THRESHOLD_HUMAN: SCORE_THRESHOLD_HUMAN,
    SCORE_THRESHOLD_AI: SCORE_THRESHOLD_AI
  };
});
