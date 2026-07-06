import {
  BookOpen,
  Feather,
  Heart,
  Search,
  Scroll,
  Star,
  Flame,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Template = {
  id: string;
  genre: string;
  title: string;
  description: string;
  icon: LucideIcon;
  placeholder: string;
  starterContent: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "freewrite",
    genre: "Freewrite",
    title: "Blank Page",
    description: "Start from nothing. Your words, your structure, your pace.",
    icon: Feather,
    placeholder: "Begin your story here… let the words flow.",
    starterContent: "",
  },
  {
    id: "literary-fiction",
    genre: "Literary Fiction",
    title: "Literary Fiction",
    description: "Character-driven prose with depth of theme and language.",
    icon: BookOpen,
    placeholder:
      "Introduce your protagonist in a moment that reveals everything…",
    starterContent: "<h1>Untitled</h1><p></p>",
  },
  {
    id: "fantasy",
    genre: "Fantasy",
    title: "Fantasy",
    description: "Worlds beyond imagination — magic, myth, and wonder.",
    icon: Star,
    placeholder: "In a land where the old magic still breathes…",
    starterContent: "<h1>Chapter One</h1><p></p>",
  },
  {
    id: "romance",
    genre: "Romance",
    title: "Romance",
    description: "Love in all its forms — tender, passionate, or complicated.",
    icon: Heart,
    placeholder:
      "The first time she saw him, she knew it was going to be a problem…",
    starterContent: "<h1>Chapter One</h1><p></p>",
  },
  {
    id: "mystery",
    genre: "Mystery",
    title: "Mystery",
    description: "Secrets, suspense, and the slow unraveling of truth.",
    icon: Search,
    placeholder: "The call came at 3am — the kind that changes everything…",
    starterContent: "<h1>Chapter One</h1><p></p>",
  },
  {
    id: "memoir",
    genre: "Memoir",
    title: "Memoir",
    description: "Your truth, told with courage and clarity.",
    icon: Scroll,
    placeholder: "The memory that keeps returning to me is this one…",
    starterContent: "<h1>My Story</h1><p></p>",
  },
  {
    id: "thriller",
    genre: "Thriller",
    title: "Thriller",
    description: "Heart-pounding tension and stakes that demand resolution.",
    icon: Flame,
    placeholder: "She had exactly twelve hours to stop what was coming…",
    starterContent: "<h1>Chapter One</h1><p></p>",
  },
];
