"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Feather, ArrowRight, ArrowLeft, Plus, X,
  Loader2, Check, Users, Globe, BookOpen, Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface Character {
  name: string;
  role: string;
  traits: string[];
  hair: string;
  eyes: string;
  heightBuild: string;
  firstImpression: string;
  externalGoal: string;
  fears: string;
}

interface Location {
  title: string;
  oneLine: string;
  atmosphere: string;
}

interface WizardData {
  title: string;
  genre: string;
  subgenre: string;
  premise: string;
  timePeriod: string;
  setting: string;
  characters: Character[];
  locations: Location[];
  chapterCount: number;
  incitingIncident: string;
  midpoint: string;
  blackMoment: string;
  resolution: string;
}

const EMPTY_CHARACTER: Character = {
  name: "", role: "Protagonist", traits: [],
  hair: "", eyes: "", heightBuild: "",
  firstImpression: "", externalGoal: "", fears: "",
};

const EMPTY_LOCATION: Location = {
  title: "", oneLine: "", atmosphere: "",
};

// ── Genre data ─────────────────────────────────────────

const GENRES = [
  "Romance", "Thriller", "Fantasy", "Mystery",
  "Sci-Fi", "Literary", "Horror", "Contemporary",
];

const SUBGENRES: Record<string, string[]> = {
  Romance: ["Enemies to Lovers", "Second Chance", "Forced Proximity", "Fake Dating", "Small Town", "Dark Romance", "Sports Romance", "Mafia Romance", "Medical Romance", "Age Gap"],
  Thriller: ["Psychological", "Legal", "Political", "Medical", "Tech", "Spy", "Domestic"],
  Fantasy: ["Epic Fantasy", "Urban Fantasy", "Dark Fantasy", "Romantasy", "High Fantasy", "Portal Fantasy"],
  Mystery: ["Cozy Mystery", "Detective", "Crime", "Amateur Sleuth", "Police Procedural"],
  "Sci-Fi": ["Space Opera", "Dystopian", "Cyberpunk", "Time Travel", "First Contact", "Post-Apocalyptic"],
  Literary: ["Historical", "Coming of Age", "Family Saga", "Magical Realism"],
  Horror: ["Supernatural", "Psychological", "Gothic", "Cosmic", "Slasher"],
  Contemporary: ["Women's Fiction", "Chick Lit", "Family Drama", "Slice of Life"],
};

const TRAIT_OPTIONS = [
  "Witty", "Stubborn", "Loyal", "Ambitious", "Sarcastic",
  "Compassionate", "Guarded", "Charming", "Reckless", "Methodical",
  "Fierce", "Gentle", "Cynical", "Optimistic", "Secretive",
  "Brave", "Anxious", "Charismatic", "Introverted", "Protective",
  "Impulsive", "Patient", "Competitive", "Empathetic", "Cold",
];

const ROLES = ["Protagonist", "Love Interest", "Antagonist", "Supporting", "Mentor", "Comic Relief"];

// ── Small components ────────────────────────────────────

function StepHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <div style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gold-subtle)", border: "1px solid var(--gold-border)" }}>
          <Icon style={{ width: "16px", height: "16px", color: "var(--gold-primary)" }} />
        </div>
        <h2 style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.03em", color: "var(--text-primary)", margin: 0 }}>
          {title}
        </h2>
      </div>
      <p style={{ fontSize: "14px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
        {subtitle}
      </p>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, multiline, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}) {
  const base: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    fontSize: "13px", fontFamily: "var(--font-inter)",
    outline: "none", transition: "border-color 0.15s",
    boxSizing: "border-box",
  };

  return (
    <div>
      <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{ ...base, resize: "vertical", lineHeight: 1.6 }}
          onFocus={(e) => { e.target.style.borderColor = "var(--gold-primary)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={base}
          onFocus={(e) => { e.target.style.borderColor = "var(--gold-primary)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; }}
        />
      )}
      {hint && (
        <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", marginTop: "4px", fontStyle: "italic" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function TraitChip({ trait, selected, onClick }: { trait: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px", fontSize: "12px",
        fontFamily: "var(--font-inter)", fontWeight: 500,
        border: "1px solid",
        borderColor: selected ? "var(--gold-primary)" : "var(--border-color)",
        background: selected ? "var(--gold-subtle)" : "transparent",
        color: selected ? "var(--gold-primary)" : "var(--text-muted)",
        cursor: "pointer", transition: "all 0.15s",
      }}>
      {selected && <span style={{ marginRight: "4px", fontSize: "10px" }}>✓</span>}
      {trait}
    </button>
  );
}

// ── Step components ────────────────────────────────────

function Step1Book({ data, onChange }: { data: WizardData; onChange: (updates: Partial<WizardData>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <StepHeader
        icon={Feather}
        title="Your Book"
        subtitle="Tell us about the story you're writing. Don't worry — you can change everything later."
      />

      <Field
        label="Working Title"
        value={data.title}
        onChange={(v) => onChange({ title: v })}
        placeholder="e.g. The Dark Between Stars"
        hint="Leave blank if you haven't decided yet."
      />

      {/* Genre */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
          Genre
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => onChange({ genre: g, subgenre: "" })}
              style={{
                padding: "7px 14px", fontSize: "13px",
                fontFamily: "var(--font-inter)", fontWeight: 500,
                border: "1px solid",
                borderColor: data.genre === g ? "var(--gold-primary)" : "var(--border-color)",
                background: data.genre === g ? "var(--gold-subtle)" : "transparent",
                color: data.genre === g ? "var(--gold-primary)" : "var(--text-muted)",
                cursor: "pointer", transition: "all 0.15s",
              }}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Subgenre */}
      {data.genre && SUBGENRES[data.genre] && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
            Subgenre / Tropes (pick all that apply)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {SUBGENRES[data.genre].map((s) => (
              <button
                key={s}
                onClick={() => onChange({ subgenre: data.subgenre === s ? "" : s })}
                style={{
                  padding: "5px 12px", fontSize: "12px",
                  fontFamily: "var(--font-inter)", fontWeight: 500,
                  border: "1px solid",
                  borderColor: data.subgenre === s ? "var(--gold-primary)" : "var(--border-color)",
                  background: data.subgenre === s ? "var(--gold-subtle)" : "transparent",
                  color: data.subgenre === s ? "var(--gold-primary)" : "var(--text-muted)",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <Field
        label="One-line premise"
        value={data.premise}
        onChange={(v) => onChange({ premise: v })}
        placeholder="A story about a nurse who falls for her patient's brooding brother..."
        hint="Finish the sentence: 'A story about...'"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Field
          label="Time Period"
          value={data.timePeriod}
          onChange={(v) => onChange({ timePeriod: v })}
          placeholder="Present day, 1920s, Near future..."
        />
        <Field
          label="Setting / Location"
          value={data.setting}
          onChange={(v) => onChange({ setting: v })}
          placeholder="Small town Texas, New York City..."
        />
      </div>
    </div>
  );
}

function Step2Characters({ data, onChange }: { data: WizardData; onChange: (updates: Partial<WizardData>) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const updateCharacter = (index: number, updates: Partial<Character>) => {
    const updated = data.characters.map((c, i) => i === index ? { ...c, ...updates } : c);
    onChange({ characters: updated });
  };

  const addCharacter = () => {
    onChange({ characters: [...data.characters, { ...EMPTY_CHARACTER }] });
    setActiveIndex(data.characters.length);
  };

  const removeCharacter = (index: number) => {
    if (data.characters.length <= 1) return;
    const updated = data.characters.filter((_, i) => i !== index);
    onChange({ characters: updated });
    setActiveIndex(Math.min(activeIndex, updated.length - 1));
  };

  const char = data.characters[activeIndex];
  if (!char) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <StepHeader
        icon={Users}
        title="Your Characters"
        subtitle="Who are the people in your story? Start with your main characters."
      />

      {/* Character tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {data.characters.map((c, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", fontSize: "12px",
              fontFamily: "var(--font-inter)", fontWeight: 500,
              border: "1px solid",
              borderColor: activeIndex === i ? "var(--gold-primary)" : "var(--border-color)",
              background: activeIndex === i ? "var(--gold-subtle)" : "transparent",
              color: activeIndex === i ? "var(--gold-primary)" : "var(--text-muted)",
              cursor: "pointer", transition: "all 0.15s",
            }}>
            {c.name || `Character ${i + 1}`}
            {data.characters.length > 1 && (
              <span
                onClick={(e) => { e.stopPropagation(); removeCharacter(i); }}
                style={{ opacity: 0.5, fontSize: "14px", lineHeight: 1 }}>
                ×
              </span>
            )}
          </button>
        ))}
        {data.characters.length < 5 && (
          <button
            onClick={addCharacter}
            style={{ padding: "6px 12px", fontSize: "12px", fontFamily: "var(--font-inter)", background: "transparent", border: "1px dashed var(--border-color)", color: "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            <Plus style={{ width: "12px", height: "12px" }} />
            Add
          </button>
        )}
      </div>

      {/* Character form */}
      <div style={{ padding: "20px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "16px" }}>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Field
            label="Name"
            value={char.name}
            onChange={(v) => updateCharacter(activeIndex, { name: v })}
            placeholder="Character name"
          />
          <div>
            <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>
              Role
            </label>
            <select
              value={char.role}
              onChange={(e) => updateCharacter(activeIndex, { role: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", background: "var(--bg-surface)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontSize: "13px", fontFamily: "var(--font-inter)", outline: "none" }}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Physical */}
        <div>
          <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
            Physical Description
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <Field label="Hair" value={char.hair} onChange={(v) => updateCharacter(activeIndex, { hair: v })} placeholder="Dark, curly..." />
            <Field label="Eyes" value={char.eyes} onChange={(v) => updateCharacter(activeIndex, { eyes: v })} placeholder="Green, warm..." />
            <Field label="Build" value={char.heightBuild} onChange={(v) => updateCharacter(activeIndex, { heightBuild: v })} placeholder="Tall, athletic..." />
          </div>
        </div>

        <Field
          label="First Impression"
          value={char.firstImpression}
          onChange={(v) => updateCharacter(activeIndex, { firstImpression: v })}
          placeholder="When you first meet them, you notice..."
        />

        {/* Traits */}
        <div>
          <label style={{ display: "block", fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>
            Personality Traits (pick 3–5)
            <span style={{ color: "var(--text-dim)", fontWeight: 400, marginLeft: "6px" }}>
              {char.traits.length} selected
            </span>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {TRAIT_OPTIONS.map((trait) => (
              <TraitChip
                key={trait}
                trait={trait}
                selected={char.traits.includes(trait)}
                onClick={() => {
                  const traits = char.traits.includes(trait)
                    ? char.traits.filter((t) => t !== trait)
                    : char.traits.length < 5 ? [...char.traits, trait] : char.traits;
                  updateCharacter(activeIndex, { traits });
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Field
            label="What they want"
            value={char.externalGoal}
            onChange={(v) => updateCharacter(activeIndex, { externalGoal: v })}
            placeholder="Their external goal..."
            multiline
          />
          <Field
            label="What they fear"
            value={char.fears}
            onChange={(v) => updateCharacter(activeIndex, { fears: v })}
            placeholder="Their deepest fear..."
            multiline
          />
        </div>
      </div>
    </div>
  );
}

function Step3World({ data, onChange }: { data: WizardData; onChange: (updates: Partial<WizardData>) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const updateLocation = (index: number, updates: Partial<Location>) => {
    const updated = data.locations.map((l, i) => i === index ? { ...l, ...updates } : l);
    onChange({ locations: updated });
  };

  const addLocation = () => {
    onChange({ locations: [...data.locations, { ...EMPTY_LOCATION }] });
    setActiveIndex(data.locations.length);
  };

  const removeLocation = (index: number) => {
    if (data.locations.length <= 1) return;
    const updated = data.locations.filter((_, i) => i !== index);
    onChange({ locations: updated });
    setActiveIndex(Math.min(activeIndex, updated.length - 1));
  };

  const loc = data.locations[activeIndex];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <StepHeader
        icon={Globe}
        title="Your World"
        subtitle="Where does your story take place? Add the key locations."
      />

      {/* Location tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {data.locations.map((l, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", fontSize: "12px",
              fontFamily: "var(--font-inter)", fontWeight: 500,
              border: "1px solid",
              borderColor: activeIndex === i ? "var(--gold-primary)" : "var(--border-color)",
              background: activeIndex === i ? "var(--gold-subtle)" : "transparent",
              color: activeIndex === i ? "var(--gold-primary)" : "var(--text-muted)",
              cursor: "pointer", transition: "all 0.15s",
            }}>
            {l.title || `Location ${i + 1}`}
            {data.locations.length > 1 && (
              <span
                onClick={(e) => { e.stopPropagation(); removeLocation(i); }}
                style={{ opacity: 0.5, fontSize: "14px", lineHeight: 1 }}>
                ×
              </span>
            )}
          </button>
        ))}
        {data.locations.length < 5 && (
          <button
            onClick={addLocation}
            style={{ padding: "6px 12px", fontSize: "12px", fontFamily: "var(--font-inter)", background: "transparent", border: "1px dashed var(--border-color)", color: "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            <Plus style={{ width: "12px", height: "12px" }} />
            Add
          </button>
        )}
      </div>

      {loc && (
        <div style={{ padding: "20px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "16px" }}>
          <Field
            label="Location Name"
            value={loc.title}
            onChange={(v) => updateLocation(activeIndex, { title: v })}
            placeholder="e.g. St. Mary's Hospital, The Blackwood Estate..."
          />
          <Field
            label="One-line description"
            value={loc.oneLine}
            onChange={(v) => updateLocation(activeIndex, { oneLine: v })}
            placeholder="A bustling ER in downtown Chicago..."
          />
          <Field
            label="Atmosphere & Feel"
            value={loc.atmosphere}
            onChange={(v) => updateLocation(activeIndex, { atmosphere: v })}
            placeholder="Sterile and bright under fluorescent lights, always busy..."
            multiline
          />
        </div>
      )}
    </div>
  );
}

function Step4Outline({ data, onChange }: { data: WizardData; onChange: (updates: Partial<WizardData>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <StepHeader
        icon={BookOpen}
        title="Your Story Arc"
        subtitle="Sketch the key turning points. These become your outline — you can fill in chapters later."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Field
          label="Planned chapters"
          value={data.chapterCount > 0 ? String(data.chapterCount) : ""}
          onChange={(v) => onChange({ chapterCount: parseInt(v) || 0 })}
          placeholder="20"
          hint="Rough estimate is fine"
        />
      </div>

      <Field
        label="Inciting Incident"
        value={data.incitingIncident}
        onChange={(v) => onChange({ incitingIncident: v })}
        placeholder="The event that kicks off the main story..."
        multiline
        hint="What happens that forces your protagonist into the story?"
      />

      <Field
        label="Midpoint"
        value={data.midpoint}
        onChange={(v) => onChange({ midpoint: v })}
        placeholder="The point of no return — everything changes here..."
        multiline
        hint="Around the halfway mark. What major shift happens?"
      />

      <Field
        label="Black Moment"
        value={data.blackMoment}
        onChange={(v) => onChange({ blackMoment: v })}
        placeholder="The darkest point before the resolution..."
        multiline
        hint="When all seems lost. What's the lowest point for your protagonist?"
      />

      <Field
        label="Resolution"
        value={data.resolution}
        onChange={(v) => onChange({ resolution: v })}
        placeholder="How does the story end?"
        multiline
        hint="How does the main conflict resolve? What does your protagonist gain or lose?"
      />
    </div>
  );
}

function Step5Summary({ data }: { data: WizardData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <StepHeader
        icon={Sparkles}
        title="Your Story Bible is ready"
        subtitle="Here's what we've set up for you. Everything can be edited in the Story Bible at any time."
      />

      {/* Summary cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Book */}
        <div style={{ padding: "16px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderLeft: "2px solid var(--gold-primary)" }}>
          <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold-primary)", marginBottom: "8px" }}>
            The Book
          </p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "16px", color: "var(--text-primary)", margin: "0 0 4px" }}>
            {data.title || "Untitled"}
          </p>
          <p style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", margin: "0 0 4px" }}>
            {[data.genre, data.subgenre].filter(Boolean).join(" · ")}
          </p>
          {data.premise && (
            <p style={{ fontSize: "13px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", fontStyle: "italic", margin: 0 }}>
              {data.premise}
            </p>
          )}
        </div>

        {/* Characters */}
        {data.characters.filter((c) => c.name).length > 0 && (
          <div style={{ padding: "16px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)" }}>
            <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "10px" }}>
              {data.characters.filter((c) => c.name).length} Character{data.characters.filter((c) => c.name).length !== 1 ? "s" : ""}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.characters.filter((c) => c.name).map((char, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--gold-subtle)", border: "1px solid var(--gold-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 700, color: "var(--gold-primary)" }}>
                      {char.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", fontFamily: "var(--font-inter)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>
                      {char.name} <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>— {char.role}</span>
                    </p>
                    {char.traits.length > 0 && (
                      <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", margin: 0 }}>
                        {char.traits.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        {data.locations.filter((l) => l.title).length > 0 && (
          <div style={{ padding: "16px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)" }}>
            <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "10px" }}>
              {data.locations.filter((l) => l.title).length} Location{data.locations.filter((l) => l.title).length !== 1 ? "s" : ""}
            </p>
            {data.locations.filter((l) => l.title).map((loc, i) => (
              <p key={i} style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", margin: "0 0 4px" }}>
                <strong style={{ color: "var(--text-primary)" }}>{loc.title}</strong>
                {loc.oneLine && ` — ${loc.oneLine}`}
              </p>
            ))}
          </div>
        )}

        {/* Outline */}
        {(data.incitingIncident || data.midpoint || data.blackMoment || data.resolution) && (
          <div style={{ padding: "16px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)" }}>
            <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "10px" }}>
              Story Arc
            </p>
            {[
              { label: "Inciting Incident", value: data.incitingIncident },
              { label: "Midpoint", value: data.midpoint },
              { label: "Black Moment", value: data.blackMoment },
              { label: "Resolution", value: data.resolution },
            ].filter((item) => item.value).map((item, i) => (
              <div key={i} style={{ marginBottom: "8px" }}>
                <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, color: "var(--gold-primary)", margin: "0 0 2px" }}>
                  {item.label}
                </p>
                <p style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", margin: 0 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────

const STEPS = [
  { id: "book",       label: "The Book",      icon: Feather },
  { id: "characters", label: "Characters",    icon: Users },
  { id: "world",      label: "World",         icon: Globe },
  { id: "outline",    label: "Story Arc",     icon: BookOpen },
  { id: "summary",    label: "Ready",         icon: Sparkles },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<WizardData>({
    title: "",
    genre: "",
    subgenre: "",
    premise: "",
    timePeriod: "",
    setting: "",
    characters: [{ ...EMPTY_CHARACTER }],
    locations: [{ ...EMPTY_LOCATION }],
    chapterCount: 0,
    incitingIncident: "",
    midpoint: "",
    blackMoment: "",
    resolution: "",
  });

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          characters: data.characters.filter((c) => c.name.trim()),
          locations: data.locations.filter((l) => l.title.trim()),
        }),
      });

      const result = await res.json() as { documentId: string };
      router.push(`/editor/${result.documentId}`);
    } catch (err) {
      console.error("Onboarding error:", err);
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return !!data.genre;
    return true;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "0 2rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", background: "var(--topbar-bg)", backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Feather style={{ width: "16px", height: "16px", color: "var(--gold-primary)" }} />
          <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "15px", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Prosr
          </span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
          Skip setup
        </button>
      </div>

      {/* Progress steps */}
      <div style={{ padding: "1.5rem 2rem 0", maxWidth: "680px", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div style={{
                  width: "32px", height: "32px",
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < step ? "var(--gold-primary)" : i === step ? "var(--gold-subtle)" : "var(--bg-elevated)",
                  border: `1px solid ${i <= step ? "var(--gold-primary)" : "var(--border-color)"}`,
                  transition: "all 0.3s",
                }}>
                  {i < step
                    ? <Check style={{ width: "14px", height: "14px", color: "var(--bg-primary)" }} />
                    : <s.icon style={{ width: "14px", height: "14px", color: i === step ? "var(--gold-primary)" : "var(--text-dim)" }} />}
                </div>
                <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, color: i === step ? "var(--gold-primary)" : "var(--text-dim)", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: "1px", background: i < step ? "var(--gold-primary)" : "var(--border-color)", margin: "0 8px 20px", transition: "background 0.3s" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}>
              {step === 0 && <Step1Book data={data} onChange={updateData} />}
              {step === 1 && <Step2Characters data={data} onChange={updateData} />}
              {step === 2 && <Step3World data={data} onChange={updateData} />}
              {step === 3 && <Step4Outline data={data} onChange={updateData} />}
              {step === 4 && <Step5Summary data={data} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer nav */}
      <div style={{ padding: "1.25rem 2rem", borderTop: "1px solid var(--border-color)", background: "var(--topbar-bg)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "transparent", border: "1px solid var(--border-color)", color: step === 0 ? "var(--text-dim)" : "var(--text-muted)", cursor: step === 0 ? "not-allowed" : "pointer", fontSize: "13px", fontFamily: "var(--font-inter)", fontWeight: 500, transition: "all 0.15s" }}>
          <ArrowLeft style={{ width: "14px", height: "14px" }} />
          Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {step < STEPS.length - 1 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer" }}>
              Skip this step
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 20px", background: canProceed() ? "var(--gold-primary)" : "var(--bg-elevated)", color: canProceed() ? "var(--bg-primary)" : "var(--text-dim)", border: "none", cursor: canProceed() ? "pointer" : "not-allowed", fontSize: "13px", fontFamily: "var(--font-inter)", fontWeight: 600, transition: "all 0.15s" }}>
              Next
              <ArrowRight style={{ width: "14px", height: "14px" }} />
            </button>
          ) : (
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 24px", background: "var(--gold-primary)", color: "var(--bg-primary)", border: "none", cursor: submitting ? "not-allowed" : "pointer", fontSize: "13px", fontFamily: "var(--font-inter)", fontWeight: 600, opacity: submitting ? 0.7 : 1 }}>
              {submitting
                ? <><Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" /> Creating your book…</>
                : <><Sparkles style={{ width: "14px", height: "14px" }} /> Start Writing</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}