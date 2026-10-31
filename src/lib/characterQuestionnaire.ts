/**
 * Character questionnaire attached to each character in the Story Bible.
 *
 * Answers are stored per character (characters.questionnaire) keyed by item
 * id (`c1`…`c20`, matching the question numbers), so keep existing questions
 * in place when editing the text; append new ones. If the questions are
 * replaced wholesale, change the id prefix so old answers aren't shown under
 * new questions (`q` was used by an earlier 18-question version).
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

export const QUESTIONNAIRE_TITLE = "Character Questionnaire";

export const DONT_KNOW_YET = "I don't know yet.";

const PARTS: { title: string; questions: string[] }[] = [
  {
    title: "Wants and fears",
    questions: [
      "What does this character want right now, in a way they could name out loud?",
      "What do they want underneath that, the thing they’d never admit?",
      "What are they most afraid of losing, and who or what is it tied to?",
      "What happened in their past that still shapes how they act today?",
      "What lie do they believe about themselves or the world?",
    ],
  },
  {
    title: "Voice and habits",
    questions: [
      "How do they talk when they’re comfortable, and how does that change when they’re scared, angry or attracted to someone?",
      "What do they do with their hands or body when they’re lying?",
      "What’s their go-to joke or deflection, and what is it covering for?",
      "What words or phrases would nobody else in your story say?",
      "What do they notice first when they walk into a room? (For a thief, that’s the exits. For a mob boss, it might be who’s watching.)",
    ],
  },
  {
    title: "Specifics and texture",
    questions: [
      "Where did they grow up, and what’s one detail of that place only they would mention?",
      "What do they own that they’d grab in a fire, and why?",
      "What do they eat, drink, listen to or watch when nobody’s looking?",
      "What’s the most ordinary thing about them, the thing that makes them feel like a person and not a type?",
    ],
  },
  {
    title: "Relationships and conflict",
    questions: [
      "Who do they call at 2 a.m., and who do they never call?",
      "Who knows the real version of them, and who only gets the performance?",
      "What would make them break their own rules, and what rule would they never break?",
      "How do they behave around someone they’re attracted to but shouldn’t be? (This is the “Malachi’s girl” question: what’s the cost?)",
    ],
  },
  {
    title: "Stakes and change",
    questions: [
      "What would they have to give up to get what they want?",
      "How should they be different by the last page, and what would force that change?",
    ],
  },
];

// Questions are numbered continuously across parts.
let questionNumber = 0;
export const QUESTIONNAIRE: QuestionnairePart[] = PARTS.map((part, i) => ({
  id: `part${i + 1}`,
  number: String(i + 1),
  title: part.title,
  items: part.questions.map((text) => {
    questionNumber += 1;
    return { id: `c${questionNumber}`, label: String(questionNumber), text };
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

export const partHeading = (part: QuestionnairePart) => part.title;

/** The filled-in questionnaire as Markdown, for download. */
export function questionnaireToMarkdown(
  a: QuestionnaireAnswers,
  header: { name: string; story: string },
): string {
  const lines: string[] = [
    `# ${QUESTIONNAIRE_TITLE}`,
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
