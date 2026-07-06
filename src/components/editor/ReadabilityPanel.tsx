"use client;";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  X,
  BookOpen,
  Clock,
  MessageSquare,
  Activity,
} from "lucide-react";
import { analyzeReadability } from "@/lib/readability";

interface ReadabilityPanelProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{
        background: "rgba(184, 120, 50, 0.06)",
        border: "1px solid rgba(184, 120, 50, 0.15)",
      }}
    >
      <div className="font-display text-xl text-ink-800">{value}</div>
      <div className="text-xs font-sans text-sepia-500 mt-0.5">{label}</div>
      {sub && (
        <div className="text-xs font-sans text-sepia-300 mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max = 100,
  color,
  description,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  description?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-sans text-sepia-600">{label}</span>
        <span className="text-xs font-sans font-medium text-ink-700">
          {value}
          {max !== 100 ? `/${max}` : "%"}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(184, 120, 50, 0.12)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      {description && (
        <p className="text-xs font-sans text-sepia-400 mt-0.5">{description}</p>
      )}
    </div>
  );
}

function SentenceVarietyBar({
  short,
  medium,
  long,
}: {
  short: number;
  medium: number;
  long: number;
}) {
  const total = short + medium + long;
  if (total === 0) return null;
  const shortPct = (short / total) * 100;
  const medPct = (medium / total) * 100;
  const longPct = (long / total) * 100;

  return (
    <div className="mb-4">
      <p className="text-xs font-sans text-sepia-500 uppercase tracking-wider mb-2">
        Sentence Length Variety
      </p>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${shortPct}%` }}
          transition={{ duration: 0.6 }}
          className="h-full rounded-l-full"
          style={{ background: "#22c55e" }}
          title={`Short: ${short}`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${medPct}%` }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="h-full"
          style={{ background: "var(--gold-accent)" }}
          title={`Medium: ${medium}`}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${longPct}%` }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="h-full rounded-r-full"
          style={{ background: "#ef4444" }}
          title={`Long: ${long}`}
        />
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <span className="flex items-center gap-1 text-xs font-sans text-sepia-400">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: "#22c55e" }}
          />
          Short {Math.round(shortPct)}%
        </span>
        <span className="flex items-center gap-1 text-xs font-sans text-sepia-400">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: "var(--gold-accent)" }}
          />
          Medium {Math.round(medPct)}%
        </span>
        <span className="flex items-center gap-1 text-xs font-sans text-sepia-400">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: "#ef4444" }}
          />
          Long {Math.round(longPct)}%
        </span>
      </div>
      <p className="text-xs font-sans text-sepia-400 mt-1 italic">
        {shortPct > 60
          ? "Too many short sentences — vary your rhythm."
          : longPct > 40
            ? "Many long sentences — consider breaking some up."
            : "Good sentence variety."}
      </p>
    </div>
  );
}

function FleschGauge({ score }: { score: number }) {
  const color =
    score >= 70 ? "#22c55e" : score >= 50 ? "var(--gold-accent)" : "#ef4444";
  const label =
    score >= 90
      ? "Very Easy"
      : score >= 80
        ? "Easy"
        : score >= 70
          ? "Fairly Easy"
          : score >= 60
            ? "Standard"
            : score >= 50
              ? "Fairly Difficult"
              : score >= 30
                ? "Difficult"
                : "Very Difficult";

  return (
    <div className="card-parchment p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-display text-base text-ink-800">
            Readability Score
          </p>
          <p className="text-xs font-sans text-sepia-400">
            Flesch Reading Ease
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl" style={{ color }}>
            {score}
          </p>
          <p className="text-xs font-sans" style={{ color }}>
            {label}
          </p>
        </div>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(184, 120, 50, 0.12)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <div className="flex justify-between text-xs font-sans text-sepia-300 mt-1">
        <span>Hard</span>
        <span>Easy</span>
      </div>
    </div>
  );
}

export default function ReadabilityPanel({
  content,
  isOpen,
  onClose,
}: ReadabilityPanelProps) {
  const stats = useMemo(() => analyzeReadability(content), [content]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="fixed right-0 top-0 bottom-0 w-80 xl:w-96 flex flex-col z-40 shadow-2xl"
          style={{
            background: "hsl(var(--card))",
            borderLeft: "1px solid hsl(var(--border))",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
            style={{ borderBottom: "1px solid hsl(var(--border))" }}
          >
            <div className="flex items-center gap-2">
              <BarChart2
                className="w-4 h-4"
                style={{ color: "var(--gold-accent)" }}
              />
              <span className="font-display text-base text-ink-800">
                Readability
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-parchment-200 transition-colors"
            >
              <X className="w-4 h-4 text-sepia-400" />
            </button>
          </div>

          {stats.wordCount === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <BarChart2
                  className="w-10 h-10 mx-auto mb-3 opacity-30"
                  style={{ color: "var(--gold-accent)" }}
                />
                <p className="font-serif text-sm italic text-sepia-400">
                  Start writing to see readability analysis.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label="Words"
                  value={stats.wordCount.toLocaleString()}
                />
                <StatCard label="Reading Time" value={stats.readingTime} />
                <StatCard
                  label="Sentences"
                  value={stats.sentenceCount.toLocaleString()}
                />
                <StatCard
                  label="Paragraphs"
                  value={stats.paragraphCount.toLocaleString()}
                />
              </div>

              {/* Flesch score */}
              <FleschGauge score={stats.fleschReadingEase} />

              {/* Grade level */}
              <div className="card-parchment p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sepia-400" />
                  <div>
                    <p className="text-xs font-sans text-sepia-500">
                      Grade Level
                    </p>
                    <p className="text-sm font-sans font-medium text-ink-700">
                      Grade {stats.fleschKincaidGrade}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sepia-400" />
                  <div>
                    <p className="text-xs font-sans text-sepia-500">
                      Avg Sentence
                    </p>
                    <p className="text-sm font-sans font-medium text-ink-700">
                      {stats.avgWordsPerSentence} words
                    </p>
                  </div>
                </div>
              </div>

              {/* Sentence variety */}
              <div className="card-parchment p-3">
                <SentenceVarietyBar
                  short={stats.shortSentences}
                  medium={stats.mediumSentences}
                  long={stats.longSentences}
                />
              </div>

              {/* Style metrics */}
              <div className="card-parchment p-3">
                <p className="text-xs font-sans text-sepia-500 uppercase tracking-wider mb-3">
                  Style Metrics
                </p>
                <ScoreBar
                  label="Passive Voice"
                  value={stats.passiveVoicePercent}
                  color={
                    stats.passiveVoicePercent > 20
                      ? "#ef4444"
                      : stats.passiveVoicePercent > 10
                        ? "#f59e0b"
                        : "#22c55e"
                  }
                  description={
                    stats.passiveVoicePercent > 20
                      ? "High — consider using active voice more"
                      : stats.passiveVoicePercent > 10
                        ? "Moderate passive voice"
                        : "Good — mostly active voice"
                  }
                />
                <ScoreBar
                  label="Dialogue"
                  value={stats.dialoguePercent}
                  color="var(--gold-accent)"
                  description={
                    stats.dialoguePercent > 60
                      ? "Dialogue-heavy"
                      : stats.dialoguePercent < 10
                        ? "Very little dialogue"
                        : "Good balance"
                  }
                />
                <div
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid hsl(var(--border))" }}
                >
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-sepia-400" />
                    <span className="text-xs font-sans text-sepia-600">
                      Adverbs (-ly words)
                    </span>
                  </div>
                  <span
                    className="text-xs font-sans font-medium text-ink-700"
                    style={{
                      color: stats.adverbCount > 20 ? "#ef4444" : "#2a1c06",
                    }}
                  >
                    {stats.adverbCount}
                    {stats.adverbCount > 20 ? " — consider reducing" : ""}
                  </span>
                </div>
              </div>

              {/* Overused words */}
              {stats.overusedWords.length > 0 && (
                <div className="card-parchment p-3">
                  <p className="text-xs font-sans text-sepia-500 uppercase tracking-wider mb-2">
                    Most Used Words
                  </p>
                  <div className="space-y-1.5">
                    {stats.overusedWords.map(({ word, count }) => (
                      <div key={word} className="flex items-center gap-2">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{
                            background: "hsl(var(--accent) / 0.2)",
                            border: "1px solid hsl(var(--border))",
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (count / stats.overusedWords[0].count) * 100)}%`,
                              background:
                                count > 10 ? "#ef4444" : "var(--gold-accent)",
                            }}
                          />
                        </div>
                        <span className="text-xs font-sans text-ink-700 w-20 truncate">
                          {word}
                        </span>
                        <span className="text-xs font-sans text-sepia-400 w-6 text-right">
                          {count}×
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-sans text-sepia-400 mt-2 italic">
                    Words appearing 3+ times, excluding common words.
                  </p>
                </div>
              )}

              {/* Dialogue indicator */}
              <div className="card-parchment p-3 flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-sepia-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-sans text-sepia-500">
                    Dialogue vs Prose
                  </p>
                  <p className="text-sm font-sans text-ink-700">
                    {stats.dialoguePercent}% dialogue ·{" "}
                    {100 - stats.dialoguePercent}% prose
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
