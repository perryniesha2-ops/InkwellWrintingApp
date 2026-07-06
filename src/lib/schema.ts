import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    title: text("title").notNull().default("Untitled"),
    content: text("content").notNull().default(""),
    genre: text("genre"),
    wordCount: integer("word_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("documents_user_id_idx").on(t.userId),
  }),
);

export const storyBibles = pgTable("story_bibles", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const characters = pgTable("characters", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibleId: uuid("bible_id").references(() => storyBibles.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").notNull(),
  name: text("name").notNull().default(""),
  nickname: text("nickname"),
  role: text("role"),
  age: text("age"),
  birthday: text("birthday"),
  gender: text("gender"),
  nationality: text("nationality"),
  occupation: text("occupation"),
  heightBuild: text("height_build"),
  hair: text("hair"),
  eyes: text("eyes"),
  skinTone: text("skin_tone"),
  distinguishingFeatures: text("distinguishing_features"),
  style: text("style"),
  firstImpression: text("first_impression"),
  traits: text("traits").array(),
  loveLanguage: text("love_language"),
  greatestStrength: text("greatest_strength"),
  fatalFlaw: text("fatal_flaw"),
  fears: text("fears"),
  secrets: text("secrets"),
  underPressure: text("under_pressure"),
  speechPatterns: text("speech_patterns"),
  backstory: text("backstory"),
  familySituation: text("family_situation"),
  definingMoment: text("defining_moment"),
  education: text("education"),
  greatestRegret: text("greatest_regret"),
  externalGoal: text("external_goal"),
  internalNeed: text("internal_need"),
  relationshipToMc: text("relationship_to_mc"),
  characterArc: text("character_arc"),
  characterSecrets: text("character_secrets"),
  attachmentStyle: text("attachment_style"),
  howTheyLove: text("how_they_love"),
  relationshipSabotage: text("relationship_sabotage"),
  partnerTraits: text("partner_traits"),
  emotionalWound: text("emotional_wound"),
  notes: text("notes"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const outlineSections = pgTable("outline_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibleId: uuid("bible_id").references(() => storyBibles.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default(""),
  type: text("type").default("chapter"),
  orderIndex: integer("order_index").default(0),
  content: text("content"),
  povCharacter: text("pov_character"),
  timeline: text("timeline"),
  location: text("location"),
  openingHook: text("opening_hook"),
  closingBeat: text("closing_beat"),
  keyEvents: text("key_events"),
  purpose: text("purpose"),
  conflict: text("conflict"),
  stakes: text("stakes"),
  secretsRevealed: text("secrets_revealed"),
  emotionalStart: text("emotional_start"),
  emotionalEnd: text("emotional_end"),
  readerFeels: text("reader_feels"),
  pacing: text("pacing"),
  themes: text("themes"),
  foreshadowing: text("foreshadowing"),
  callbacks: text("callbacks"),
  craftNotes: text("craft_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const worldEntries = pgTable("world_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibleId: uuid("bible_id").references(() => storyBibles.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default(""),
  category: text("category"),
  oneLine: text("one_line"),
  content: text("content"),
  history: text("history"),
  rules: text("rules"),
  exceptions: text("exceptions"),
  whoKnows: text("who_knows"),
  looksLike: text("looks_like"),
  soundsLike: text("sounds_like"),
  feelsLike: text("feels_like"),
  atmosphere: text("atmosphere"),
  plotRelevance: text("plot_relevance"),
  connectedCharacters: text("connected_characters"),
  firstIntroduced: text("first_introduced"),
  significance: text("significance"),
  images: text("images").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bibleNotes = pgTable("bible_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibleId: uuid("bible_id").references(() => storyBibles.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default(""),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentSections = pgTable("document_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull().default(""),
  content: text("content").notNull().default(""),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").notNull(),
    title: text("title").notNull().default("New Chat"),
    messageCount: integer("message_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    docIdx: index("chat_sessions_document_id_idx").on(t.documentId),
    userIdx: index("chat_sessions_user_id_idx").on(t.userId),
  }),
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").references(() => chatSessions.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    sessionIdx: index("chat_messages_session_id_idx").on(t.sessionId),
  }),
);
