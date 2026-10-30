/**
 * "18 Questions to Truly Know Your Character" — a character-discovery
 * questionnaire attached to each character in the Story Bible.
 *
 * Answers are stored per character (characters.questionnaire) keyed by item
 * id (`q1`…`q18`, matching the question numbers), so keep existing questions
 * in place when editing the text; append new ones.
 */

export interface QuestionnaireItem {
  id: string;
  /** Question number shown next to the item. */
  label: string;
  text: string;
}

export interface QuestionnairePart {
  id: string;
  number: string;
  title: string;
  items: QuestionnaireItem[];
}

export interface QuestionnaireAnswers {
  startedAt?: string;
  answers: Record<string, string>;
}

// ── Content ───────────────────────────────────────────

export const QUESTIONNAIRE_TITLE = "18 Questions to Truly Know Your Character";
export const QUESTIONNAIRE_SUBTITLE = "A practical character-discovery questionnaire for any genre";

export const DONT_KNOW_YET = "I don't know yet.";

const PARTS: { title: string; questions: string[] }[] = [
  {
    title: "Who are they outside the plot?",
    questions: [
      "Your character has an entire day free. No work, no obligations, no emergencies. How do they spend it?",
      "Your character receives unexpectedly good news. What is the news, and what is the first thing they do?",
      "Your character is spending time with someone they genuinely like. What are they doing together, and what makes that time enjoyable?",
      "What is something relatively minor that irritates your character, and how do they behave when it happens?",
    ],
  },
  {
    title: "What matters to them?",
    questions: [
      "What does your character want for themselves that has nothing to do with the immediate conflict of the novel?",
      "Your character must choose between getting something they badly want and keeping a promise to someone important. What do they choose, and why?",
      "Someone publicly challenges or embarrasses your character. What bothers them most about the incident, and how do they respond?",
      "Your character discovers that someone they trust has lied to them. The person claims they had a good reason. What happens next?",
    ],
  },
  {
    title: "How do they experience emotions?",
    questions: [
      "Your character works hard for something and fails. What do they feel immediately, and what do they do afterward?",
      "Your character realizes they're in serious danger and cannot immediately escape. What do they think about first, and what is their first action?",
      "Someone begins crying in front of your character. How do they respond? Does their response change depending on who is crying?",
      "Someone unexpectedly shows your character genuine affection, appreciation, or kindness. How do they react?",
      "Your character becomes extremely angry. What specifically caused that level of anger, and what does it take for them to calm down?",
    ],
  },
  {
    title: "How do they connect with people?",
    questions: [
      "Who are the two most important people in your character's life at the beginning of the story? How does your character behave differently with each of them?",
      "Someone your character cares about needs help at an inconvenient time. What does your character actually do?",
      "What would make your character genuinely interested in another person beyond physical appearance?",
    ],
  },
  {
    title: "What makes them distinctive?",
    questions: [
      "Describe a situation where your character feels one thing but behaves as though they feel something else. Why is there a difference?",
      "At the end of the novel, what is one important thing your character might do differently than they would at the beginning? What part of them would remain unchanged?",
    ],
  },
];

// Questions are numbered continuously across parts (1–18).
let questionNumber = 0;
export const QUESTIONNAIRE: QuestionnairePart[] = PARTS.map((part, i) => ({
  id: `part${i + 1}`,
  number: String(i + 1),
  title: part.title,
  items: part.questions.map((text) => {
    questionNumber += 1;
    return { id: `q${questionNumber}`, label: String(questionNumber), text };
  }),
}));

// ── Helpers ───────────────────────────────────────────

const isAnswered = (a: QuestionnaireAnswers, id: string) => !!a.answers[id]?.trim();

export function partProgress(part: QuestionnairePart, a: QuestionnaireAnswers) {
  return { answered: part.items.filter((i) => isAnswered(a, i.id)).length, total: part.items.length };
}

export function overallProgress(a: QuestionnaireAnswers) {
  return QUESTIONNAIRE.reduce(
    (acc, part) => {
      const p = partProgress(part, a);
      return { answered: acc.answered + p.answered, total: acc.total + p.total };
    },
    { answered: 0, total: 0 },
  );
}

/** Accepts whatever is stored in the database and normalizes it. */
export function normalizeAnswers(raw: unknown): QuestionnaireAnswers {
  if (!raw || typeof raw !== "object") return { answers: {} };
  const r = raw as Partial<QuestionnaireAnswers>;
  return {
    startedAt: typeof r.startedAt === "string" ? r.startedAt : undefined,
    answers: r.answers && typeof r.answers === "object" ? { ...r.answers } : {},
  };
}

export const partHeading = (part: QuestionnairePart) => `Part ${part.number} — ${part.title}`;

/** The filled-in questionnaire as Markdown, for download. */
export function questionnaireToMarkdown(
  a: QuestionnaireAnswers,
  header: { name: string; story: string },
): string {
  const lines: string[] = [
    `# ${QUESTIONNAIRE_TITLE}`,
    `*${QUESTIONNAIRE_SUBTITLE}*`,
    "",
    `**Character:** ${header.name || "—"}  `,
    `**Story:** ${header.story || "—"}`,
    "",
  ];
  for (const part of QUESTIONNAIRE) {
    lines.push(`### ${partHeading(part)}`, "");
    for (const item of part.items) {
      lines.push(`**${item.label}. ${item.text}**`, "", a.answers[item.id]?.trim() || "_—_", "");
    }
  }
  return lines.join("\n");
}
