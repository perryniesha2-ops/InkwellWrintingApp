"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Flame, X, Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  getGoals, saveGoals, getDailyProgress, saveDailyProgress,
  updateStreak, getStreak,
  type WritingGoals, type DailyProgress, type GoalStreak,
} from "@/lib/writingGoals";

interface WritingGoalBarProps {
  documentId: string;
  currentWordCount: number;
  manuscriptTotal: number;
}

export default function WritingGoalBar({
  documentId, currentWordCount, manuscriptTotal,
}: WritingGoalBarProps) {
  const [goals, setGoals] = useState<WritingGoals>(() => getGoals());
const [progress, setProgress] = useState<DailyProgress>(() => getDailyProgress(documentId));
const [streak, setStreak] = useState<GoalStreak>(() => getStreak());
const [showSettings, setShowSettings] = useState(false);
const [celebrated, setCelebrated] = useState(false);
const [collapsed, setCollapsed] = useState(false);
const prevWordCount = useRef(currentWordCount);
const initialized = useRef(false);

  useEffect(() => {
  // Set start word count on first load
  if (!initialized.current && currentWordCount > 0) {
    setProgress((prev) => {
      if (prev.startWordCount === 0) {
        const updated = { ...prev, startWordCount: currentWordCount };
        saveDailyProgress(documentId, updated);
        return updated;
      }
      return prev;
    });
    initialized.current = true;
    prevWordCount.current = currentWordCount;
  }
}, [currentWordCount, documentId]);

  // Track words written in this session
  useEffect(() => {
    if (!initialized.current) return;

    const wordsAdded = Math.max(0, currentWordCount - prevWordCount.current);
    prevWordCount.current = currentWordCount;

    if (wordsAdded === 0) return;

    setProgress((prev) => {
      const updated = {
        ...prev,
        wordsWritten: prev.wordsWritten + wordsAdded,
      };
      saveDailyProgress(documentId, updated);

      // Check if goal just met
      const wasComplete = prev.wordsWritten >= goals.dailyGoal;
      const nowComplete = updated.wordsWritten >= goals.dailyGoal;

      if (!wasComplete && nowComplete && !celebrated) {
        setCelebrated(true);
        const newStreak = updateStreak(true);
        setStreak(newStreak);
        setTimeout(() => setCelebrated(false), 4000);
      }

      return updated;
    });
  }, [currentWordCount, documentId, goals.dailyGoal, celebrated]);

  const dailyPercent = Math.min(100, Math.round((progress.wordsWritten / goals.dailyGoal) * 100));
  const manuscriptPercent = Math.min(100, Math.round((manuscriptTotal / goals.manuscriptGoal) * 100));
  const dailyComplete = progress.wordsWritten >= goals.dailyGoal;
  const remaining = Math.max(0, goals.dailyGoal - progress.wordsWritten);

  const barColor = dailyComplete
    ? "#22c55e"
    : dailyPercent > 60
    ? "var(--gold-primary)"
    : "var(--gold-primary)";

  return (
    <div style={{ position: "relative" }}>

      {/* Goal celebration */}
      <AnimatePresence>
        {celebrated && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{
              position: "fixed", bottom: "5rem", left: "50%",
              transform: "translateX(-50%)",
              background: "var(--bg-surface)",
              border: "1px solid #22c55e",
              padding: "12px 24px", zIndex: 9999,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
            <span style={{ fontSize: "20px" }}>🎉</span>
            <div>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "14px", color: "#22c55e", margin: 0 }}>
                Daily goal reached!
              </p>
              <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", margin: 0 }}>
                {streak.currentStreak} day streak 🔥
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main bar */}
      <div style={{
        borderTop: "1px solid var(--border-color)",
        background: "var(--bg-surface)",
        padding: collapsed ? "6px 16px" : "10px 16px",
        display: "flex", alignItems: "center", gap: "16px",
        transition: "padding 0.2s",
      }}>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{ color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "2px", flexShrink: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}>
          <Target style={{ width: "13px", height: "13px" }} />
        </button>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: 0 }}>

              {/* Daily goal */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-dim)", flexShrink: 0 }}>
                  Today
                </span>
                <div style={{ width: "80px", height: "4px", background: "var(--bg-elevated)", borderRadius: "2px", flexShrink: 0 }}>
                  <motion.div
                    style={{ height: "100%", background: barColor, borderRadius: "2px" }}
                    animate={{ width: `${dailyPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: dailyComplete ? "#22c55e" : "var(--text-muted)", flexShrink: 0 }}>
                  {dailyComplete
                    ? <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Check style={{ width: "11px", height: "11px" }} />{progress.wordsWritten.toLocaleString()}</span>
                    : `${progress.wordsWritten.toLocaleString()} / ${goals.dailyGoal.toLocaleString()}`}
                </span>
                {!dailyComplete && remaining > 0 && (
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", flexShrink: 0 }}>
                    {remaining.toLocaleString()} to go
                  </span>
                )}
              </div>

              <div style={{ width: "1px", height: "16px", background: "var(--border-color)", flexShrink: 0 }} />

              {/* Manuscript goal */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-dim)", flexShrink: 0 }}>
                  Book
                </span>
                <div style={{ width: "80px", height: "4px", background: "var(--bg-elevated)", borderRadius: "2px", flexShrink: 0 }}>
                  <motion.div
                    style={{ height: "100%", background: "var(--gold-primary)", borderRadius: "2px", opacity: 0.6 }}
                    animate={{ width: `${manuscriptPercent}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", flexShrink: 0 }}>
                  {manuscriptTotal.toLocaleString()} / {goals.manuscriptGoal.toLocaleString()}
                </span>
                <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", flexShrink: 0 }}>
                  {manuscriptPercent}%
                </span>
              </div>

              <div style={{ width: "1px", height: "16px", background: "var(--border-color)", flexShrink: 0 }} />

              {/* Streak */}
              {streak.currentStreak > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                  <Flame style={{ width: "13px", height: "13px", color: "#f97316" }} />
                  <span style={{ fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 600, color: "#f97316" }}>
                    {streak.currentStreak}
                  </span>
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
                    day streak
                  </span>
                </div>
              )}

              {/* Settings button */}
              <button
                onClick={() => setShowSettings((s) => !s)}
                style={{ marginLeft: "auto", fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}>
                Set goals
                {showSettings ? <ChevronUp style={{ width: "11px", height: "11px" }} /> : <ChevronDown style={{ width: "11px", height: "11px" }} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", borderTop: "1px solid var(--border-color)", background: "var(--bg-elevated)" }}>
            <div style={{ padding: "16px", display: "flex", gap: "24px", alignItems: "flex-end", flexWrap: "wrap" }}>

              {/* Daily goal input */}
              <div>
                <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "6px" }}>
                  Daily Word Goal
                </label>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {[500, 1000, 1500, 2000, 3000, 5000, 8000].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        const updated = { ...goals, dailyGoal: n };
                        setGoals(updated);
                        saveGoals(updated);
                      }}
                      style={{
                        padding: "4px 10px", fontSize: "11px",
                        fontFamily: "var(--font-inter)", fontWeight: 500,
                        border: "1px solid",
                        borderColor: goals.dailyGoal === n ? "var(--gold-primary)" : "var(--border-color)",
                        background: goals.dailyGoal === n ? "var(--gold-subtle)" : "transparent",
                        color: goals.dailyGoal === n ? "var(--gold-primary)" : "var(--text-muted)",
                        cursor: "pointer", transition: "all 0.15s",
                      }}>
                      {n.toLocaleString()}
                    </button>
                  ))}
                  {/* Custom input */}
                  <input
                    type="number"
                    placeholder="Custom"
                    min={100}
                    max={50000}
                    style={{
                      width: "80px", padding: "4px 8px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "11px", fontFamily: "var(--font-inter)",
                      outline: "none",
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0) {
                        const updated = { ...goals, dailyGoal: val };
                        setGoals(updated);
                        saveGoals(updated);
                        e.target.value = "";
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--gold-primary)"; }}
                  />
                </div>
              </div>

              {/* Manuscript goal input */}
              <div>
                <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "6px" }}>
                  Manuscript Goal
                </label>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {[50000, 70000, 80000, 90000, 100000, 120000].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        const updated = { ...goals, manuscriptGoal: n };
                        setGoals(updated);
                        saveGoals(updated);
                      }}
                      style={{
                        padding: "4px 10px", fontSize: "11px",
                        fontFamily: "var(--font-inter)", fontWeight: 500,
                        border: "1px solid",
                        borderColor: goals.manuscriptGoal === n ? "var(--gold-primary)" : "var(--border-color)",
                        background: goals.manuscriptGoal === n ? "var(--gold-subtle)" : "transparent",
                        color: goals.manuscriptGoal === n ? "var(--gold-primary)" : "var(--text-muted)",
                        cursor: "pointer", transition: "all 0.15s",
                      }}>
                      {(n / 1000).toFixed(0)}k
                    </button>
                  ))}
                  <input
                    type="number"
                    placeholder="Custom"
                    min={1000}
                    max={500000}
                    style={{
                      width: "80px", padding: "4px 8px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "11px", fontFamily: "var(--font-inter)",
                      outline: "none",
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0) {
                        const updated = { ...goals, manuscriptGoal: val };
                        setGoals(updated);
                        saveGoals(updated);
                        e.target.value = "";
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--gold-primary)"; }}
                  />
                </div>
              </div>

              {/* Streak info */}
              {streak.longestStreak > 0 && (
                <div style={{ marginLeft: "auto" }}>
                  <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", margin: "0 0 2px" }}>
                    Longest streak
                  </p>
                  <p style={{ fontSize: "16px", fontFamily: "var(--font-dm-sans)", fontWeight: 700, color: "#f97316", margin: 0 }}>
                    🔥 {streak.longestStreak} days
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowSettings(false)}
                style={{ padding: "6px 12px", background: "var(--gold-primary)", color: "var(--bg-primary)", border: "none", cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 600 }}>
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}