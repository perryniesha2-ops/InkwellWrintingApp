/**
 * Just enough English inflection for the thesaurus. Thesaurus data lists base
 * forms ("walk"), but writers select inflected ones ("walked"). These helpers
 * find the base form of a word and put synonyms back into the word's form
 * (stroll -> strolled, creep -> crept).
 */

export type Form = "past" | "participle" | "ing" | "s";

export interface Lemma {
  base: string;
  form: Form;
}

/** base past participle */
const IRREGULAR_VERBS = `
arise arose arisen|awake awoke awoken|be was been|bear bore borne|beat beat beaten
become became become|begin began begun|behold beheld beheld|bend bent bent|bet bet bet
bid bid bid|bind bound bound|bite bit bitten|bleed bled bled|blow blew blown
break broke broken|breed bred bred|bring brought brought|build built built|burst burst burst
buy bought bought|cast cast cast|catch caught caught|choose chose chosen|cling clung clung
come came come|cost cost cost|creep crept crept|cut cut cut|deal dealt dealt|dig dug dug
do did done|draw drew drawn|drink drank drunk|drive drove driven|eat ate eaten
fall fell fallen|feed fed fed|feel felt felt|fight fought fought|find found found
flee fled fled|fling flung flung|fly flew flown|forbid forbade forbidden|forget forgot forgotten
forgive forgave forgiven|forsake forsook forsaken|freeze froze frozen|get got gotten
give gave given|go went gone|grind ground ground|grow grew grown|hang hung hung
have had had|hear heard heard|hide hid hidden|hit hit hit|hold held held|hurt hurt hurt
keep kept kept|kneel knelt knelt|know knew known|lay laid laid|lead led led|leap leapt leapt
leave left left|lend lent lent|let let let|lie lay lain|light lit lit|lose lost lost
make made made|mean meant meant|meet met met|mistake mistook mistaken|overcome overcame overcome
overtake overtook overtaken|pay paid paid|put put put|quit quit quit|read read read
ride rode ridden|ring rang rung|rise rose risen|run ran run|say said said|see saw seen
seek sought sought|sell sold sold|send sent sent|set set set|shake shook shaken|shed shed shed
shine shone shone|shoot shot shot|show showed shown|shrink shrank shrunk|shut shut shut
sing sang sung|sink sank sunk|sit sat sat|slay slew slain|sleep slept slept|slide slid slid
sling slung slung|slink slunk slunk|slit slit slit|smite smote smitten|speak spoke spoken
speed sped sped|spend spent spent|spin spun spun|spit spat spat|split split split
spread spread spread|spring sprang sprung|stand stood stood|steal stole stolen|stick stuck stuck
sting stung stung|stink stank stunk|stride strode stridden|strike struck struck
string strung strung|strive strove striven|swear swore sworn|sweep swept swept
swell swelled swollen|swim swam swum|swing swung swung|take took taken|teach taught taught
tear tore torn|tell told told|think thought thought|throw threw thrown|thrust thrust thrust
tread trod trodden|undergo underwent undergone|understand understood understood
undertake undertook undertaken|upset upset upset|wake woke woken|wear wore worn
weave wove woven|weep wept wept|win won won|wind wound wound|withdraw withdrew withdrawn
withhold withheld withheld|withstand withstood withstood|wring wrung wrung|write wrote written`;

/**
 * base -> s-form, for verbs and nouns that don't just add -s or -es. (Not
 * leaf/leaves or life/lives: "leaves" and "lives" are more often verbs.)
 */
const IRREGULAR_S = `
be is|have has|do does|go goes|undergo undergoes|man men|woman women|child children
foot feet|tooth teeth|mouse mice|goose geese|person people|wife wives|knife knives
wolf wolves|shelf shelves|half halves|self selves|thief thieves
loaf loaves|calf calves|elf elves|hero heroes|potato potatoes|tomato tomatoes|echo echoes
veto vetoes|torpedo torpedoes`;

const VERBS = new Map<string, { past: string; participle: string }>();
const PAST_OF = new Map<string, Lemma[]>();
for (const entry of IRREGULAR_VERBS.trim().split(/\s*[|\n]\s*/)) {
  const [base, past, participle] = entry.split(" ");
  VERBS.set(base, { past, participle });
  const add = (word: string, form: Form) => PAST_OF.set(word, [...(PAST_OF.get(word) ?? []), { base, form }]);
  add(past, "past");
  if (participle !== past) add(participle, "participle");
}
PAST_OF.set("were", [{ base: "be", form: "past" }]);

const S_FORM = new Map<string, string>();
const S_BASE = new Map<string, string>();
for (const entry of IRREGULAR_S.trim().split(/\s*[|\n]\s*/)) {
  const [base, s] = entry.split(" ");
  S_FORM.set(base, s);
  S_BASE.set(s, base);
}

/** Verbs of more than one syllable that double their last letter (admit -> admitted). */
const DOUBLING = new Set(
  `abet admit aver commit compel concur confer control defer deter emit enrol equip excel expel extol
  forbid incur infer kidnap omit patrol permit propel rebel recur refer regret remit repel
  submit transfer transmit unzip`.split(/\s+/),
);

/** One-syllable words ending consonant-vowel-consonant double it: stop -> stopped. */
function doubles(base: string): boolean {
  if (DOUBLING.has(base)) return true;
  return /^[^aeiou]*[aeiou][bcdfgklmnprstvz]$/.test(base.replace(/^qu/, "q").replace(/([^aeiou])qu/, "$1q"));
}

function past(base: string): string {
  if (base.endsWith("e")) return base + "d";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ied";
  if (base.endsWith("ic")) return base + "ked";
  if (doubles(base)) return base + base.at(-1) + "ed";
  return base + "ed";
}

function ing(base: string): string {
  if (base === "be") return "being";
  if (base.endsWith("ie")) return base.slice(0, -2) + "ying";
  if (/(ee|ye|oe)$/.test(base)) return base + "ing";
  if (base.endsWith("e") && base.length > 2) return base.slice(0, -1) + "ing";
  if (base.endsWith("ic")) return base + "king";
  if (doubles(base)) return base + base.at(-1) + "ing";
  return base + "ing";
}

function sForm(base: string): string {
  const irregular = S_FORM.get(base);
  if (irregular) return irregular;
  if (/(s|x|z|ch|sh)$/.test(base)) return base + "es";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ies";
  return base + "s";
}

/** One word in the given form. */
function inflectWord(base: string, form: Form): string {
  const irregular = VERBS.get(base);
  switch (form) {
    case "past":
      return irregular?.past ?? past(base);
    case "participle":
      return irregular?.participle ?? past(base);
    case "ing":
      return ing(base);
    case "s":
      return sForm(base);
  }
}

/**
 * A base form (one word or a phrase) put into `form`. Phrasal verbs inflect
 * their first word (take off -> took off); noun phrases their last (bus stop
 * -> bus stops).
 */
export function inflect(base: string, form: Form, isVerb = true): string {
  const words = base.split(" ");
  const at = isVerb || form !== "s" ? 0 : words.length - 1;
  words[at] = inflectWord(words[at], form);
  return words.join(" ");
}

/**
 * Possible base forms of a word, most likely first. Irregular forms are
 * certain; regular ones are guesses (walked -> walk or walke) that the caller
 * checks against a dictionary. Empty if the word doesn't look inflected.
 */
export function lemmaCandidates(word: string): Lemma[] {
  const w = word.toLowerCase();
  if (!/^[a-z]+$/.test(w)) return [];
  // "read", "cut" and "come" are base forms as well as past ones: leave them be.
  const irregular = PAST_OF.get(w)?.filter((l) => l.base !== w);
  if (irregular?.length) return irregular;
  const base = S_BASE.get(w);
  if (base) return [{ base, form: "s" }];
  if (w.length < 4 || VERBS.has(w)) return [];

  const out: Lemma[] = [];
  const consider = (stem: string, form: Form) => {
    const guesses = [stem, stem + "e", stem.slice(0, -1), stem.slice(0, -1) + "y", stem.slice(0, -1) + "ie"];
    for (const guess of guesses) {
      if (guess.length < 2 || out.some((l) => l.base === guess)) continue;
      // Doubled endings like "stopp" and "runne" aren't words (but "add" and "purr" are).
      if (guess.length > 3 && /([^aeiouflrsz])\1e?$/.test(guess)) continue;
      if (inflectWord(guess, form) === w) out.push({ base: guess, form });
    }
  };
  if (w.endsWith("ed")) consider(w.slice(0, -2), "past");
  else if (w.endsWith("ing")) consider(w.slice(0, -3), "ing");
  else if (w.endsWith("s") && !w.endsWith("ss")) {
    consider(w.slice(0, -1), "s");
    if (w.endsWith("es")) consider(w.slice(0, -2), "s");
  }
  return out;
}

/** Whether a lemma came from the irregular tables (and so is certainly right). */
export function isIrregular(word: string): boolean {
  const w = word.toLowerCase();
  return !!PAST_OF.get(w)?.some((l) => l.base !== w) || S_BASE.has(w);
}
