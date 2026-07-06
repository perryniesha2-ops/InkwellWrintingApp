"use client;";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";
import type { Template } from "@/lib/templates";

interface TemplatePickerProps {
  onSelect: (template: Template) => void;
  onClose?: () => void;
}

export default function TemplatePicker({
  onSelect,
  onClose,
}: TemplatePickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{
        background: "rgba(42, 28, 6, 0.4)",
        backdropFilter: "blur(6px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="card-parchment w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-start justify-between p-7 pb-5">
          <div>
            <h2 className="font-display text-3xl text-ink-800 mb-1">
              Choose Your Canvas
            </h2>
            <p className="font-serif text-sm italic text-sepia-500">
              Select a genre to begin, or start with a blank page.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-parchment-200 transition-colors"
            >
              <X className="w-4 h-4 text-sepia-400" />
            </button>
          )}
        </div>

        <div className="filigree-divider mx-7 mb-5">
          <span className="ornament">✦</span>
        </div>

        <div className="overflow-y-auto px-7 pb-7">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEMPLATES.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelect(t)}
                className="text-left p-5 rounded-lg transition-all duration-200"
                style={{
                  border: "1px solid rgba(184, 120, 50, 0.2)",
                  background: "rgba(254, 252, 246, 0.7)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(184, 120, 50, 0.5)";
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(254, 252, 246, 1)";
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-1px)";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 4px 16px rgba(42, 28, 6, 0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(184, 120, 50, 0.2)";
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(254, 252, 246, 0.7)";
                  (e.currentTarget as HTMLElement).style.transform = "none";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "rgba(184, 120, 50, 0.1)" }}
                >
                  <t.icon
                    className="w-4 h-4"
                    style={{ color: "var(--gold-accent)" }}
                  />
                </div>
                <h3 className="font-display text-base text-ink-800 mb-1">
                  {t.title}
                </h3>
                <p className="font-sans text-xs leading-relaxed text-sepia-500">
                  {t.description}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
