/**
 * Outline templates. Applying one creates chapters (and, where a structure has
 * acts, scenes inside them) named after each beat, with guidance on what the
 * beat should do. Guidance is written as a short purpose + a question to answer.
 */
export interface TemplateBeat {
  title: string;
  guidance: string;
  children?: TemplateBeat[];
}

export interface OutlineTemplate {
  id: string;
  name: string;
  /** One line for the gallery card. */
  summary: string;
  /** When to pick this structure. */
  bestFor: string;
  beats: TemplateBeat[];
}

export const OUTLINE_TEMPLATES: OutlineTemplate[] = [
  {
    id: "three-act",
    name: "Three Act Structure",
    summary: "Setup, confrontation, resolution: the backbone of most novels and films.",
    bestFor: "Any genre. A reliable starting point if you're new to outlining.",
    beats: [
      {
        title: "Act I: Setup",
        guidance: "Roughly the first 25%. Establish who your protagonist is, what they want, and what's wrong with their world, then knock them out of it.",
        children: [
          { title: "Opening", guidance: "Show the protagonist in their ordinary life, doing something that reveals character. What does a normal day look like, and what's missing from it?" },
          { title: "Inciting Incident", guidance: "The event that disrupts the status quo and starts the story. What happens that your protagonist can't ignore?" },
          { title: "Plot Point 1", guidance: "The protagonist commits to the journey and there's no going back. What decision do they make, and what door closes behind them?" },
        ],
      },
      {
        title: "Act II: Confrontation",
        guidance: "The middle 50%. The protagonist pursues their goal against escalating obstacles, and the stakes keep rising.",
        children: [
          { title: "Rising Action", guidance: "Complications, allies and enemies. How does each attempt to reach the goal make things harder or more complicated?" },
          { title: "Midpoint", guidance: "A major revelation or reversal that changes the protagonist's understanding of the problem. What do they learn that shifts them from reacting to acting?" },
          { title: "Plot Point 2", guidance: "The lowest point: everything falls apart. What does the protagonist lose, and what false belief must they finally let go of?" },
        ],
      },
      {
        title: "Act III: Resolution",
        guidance: "The final 25%. The protagonist uses everything they've learned to face the central conflict head-on.",
        children: [
          { title: "Climax", guidance: "The final confrontation with the antagonist or central problem. How does the protagonist prove they've changed?" },
          { title: "Resolution", guidance: "Show the new normal. How is the world, and the protagonist, different from the opening?" },
        ],
      },
    ],
  },
  {
    id: "27-chapter",
    name: "27 Chapter Method",
    summary: "Three acts × three blocks × three chapters, each block following setup → conflict → resolution.",
    bestFor: "Writers who want a chapter-by-chapter roadmap for a full-length novel.",
    beats: [
      { title: "Ch 1: Introduction", guidance: "Act 1, setup. Introduce the protagonist in their ordinary world. What do they want, and what's holding them back?" },
      { title: "Ch 2: Inciting Incident", guidance: "Something happens that disrupts their world. What event forces change?" },
      { title: "Ch 3: Immediate Reaction", guidance: "Show the protagonist's first, instinctive response. Do they deny it, panic, or try to ignore it?" },
      { title: "Ch 4: Reaction", guidance: "Act 1, conflict. The protagonist processes what happened and weighs their options. What's at stake if they do nothing?" },
      { title: "Ch 5: Action", guidance: "They take a first deliberate step toward dealing with the problem. What do they decide to do?" },
      { title: "Ch 6: Consequence", guidance: "That action has a cost or unexpected result. How does it make things more complicated?" },
      { title: "Ch 7: Pressure", guidance: "Act 1, resolution. External pressure builds toward a choice. Who or what is pushing them?" },
      { title: "Ch 8: Pinch", guidance: "A reminder of the antagonist's power or the danger ahead. What shows the reader how big the threat is?" },
      { title: "Ch 9: Push", guidance: "The protagonist commits and crosses into the main story. What point of no return do they pass?" },
      { title: "Ch 10: New World", guidance: "Act 2, setup. The protagonist enters unfamiliar territory, literally or emotionally. What's strange or exciting here?" },
      { title: "Ch 11: Fun and Games", guidance: "Deliver the premise's promise: the adventure, the romance, the investigation. What scene would be on the back cover?" },
      { title: "Ch 12: Development", guidance: "Deepen relationships and subplots. Which ally, rival, or love interest becomes important?" },
      { title: "Ch 13: Reversal", guidance: "Act 2, conflict. Something the protagonist believed turns out to be wrong. What assumption gets overturned?" },
      { title: "Ch 14: Midpoint", guidance: "A major revelation that changes the protagonist from reactive to proactive. What truth do they discover?" },
      { title: "Ch 15: Fallout", guidance: "Deal with the consequences of the midpoint. How does the new knowledge raise the stakes?" },
      { title: "Ch 16: Trials", guidance: "Act 2, resolution. The protagonist pushes forward but obstacles multiply. What tests their resolve?" },
      { title: "Ch 17: Pinch", guidance: "The antagonist strikes back hard. What does the protagonist lose or nearly lose?" },
      { title: "Ch 18: Darkness", guidance: "The lowest point: all seems lost. What must they confront about themselves?" },
      { title: "Ch 19: Power Within", guidance: "Act 3, setup. The protagonist finds new resolve or insight. What do they realise or accept?" },
      { title: "Ch 20: Action", guidance: "They make a new plan and act on it. How is this approach different from before?" },
      { title: "Ch 21: Converge", guidance: "Characters and plot threads come together for the final confrontation. Who's on whose side?" },
      { title: "Ch 22: Battle", guidance: "Act 3, conflict. The final confrontation begins. What's physically and emotionally at stake?" },
      { title: "Ch 23: Climax", guidance: "The decisive moment. How does the protagonist win, or lose, by being the person they've become?" },
      { title: "Ch 24: Cooldown", guidance: "The immediate aftermath. How do the characters react to what just happened?" },
      { title: "Ch 25: Falling Action", guidance: "Act 3, resolution. Tie up subplots and relationships. Which loose ends still need closure?" },
      { title: "Ch 26: Loose Ends", guidance: "Resolve the remaining questions the reader cares about. What's the cost of victory?" },
      { title: "Ch 27: Resolution", guidance: "The new normal. Mirror the opening chapter: how has the protagonist and their world changed?" },
    ],
  },
  {
    id: "story-circle",
    name: "Dan Harmon's Story Circle",
    summary: "Eight steps of a character going somewhere, getting something, and coming back changed.",
    bestFor: "Character-driven stories, episodic fiction, and short stories.",
    beats: [
      { title: "1. You", guidance: "A character in their zone of comfort. Who are they, and what does their everyday life look like?" },
      { title: "2. Need", guidance: "But they want something. What desire or lack gets the story moving?" },
      { title: "3. Go", guidance: "They enter an unfamiliar situation. What new world, place, or circumstance do they step into?" },
      { title: "4. Search", guidance: "They adapt to it, struggling and learning the rules. What trials do they face, and who helps or hinders them?" },
      { title: "5. Find", guidance: "They get what they wanted. What do they achieve, and is it what they expected?" },
      { title: "6. Take", guidance: "They pay a heavy price for it. What does getting it cost them?" },
      { title: "7. Return", guidance: "They return to their familiar situation. How do they get back, and what do they bring with them?" },
      { title: "8. Change", guidance: "Having changed. How are they different now, and how does their old world see them?" },
    ],
  },
  {
    id: "save-the-cat",
    name: "Save the Cat! Beat Sheet",
    summary: "Blake Snyder's 15 beats, adapted widely for novels.",
    bestFor: "Commercial fiction where pacing matters: thrillers, romance, YA.",
    beats: [
      { title: "Opening Image", guidance: "A snapshot of the protagonist's world before the story changes it. What single scene captures their 'before' state?" },
      { title: "Theme Stated", guidance: "Someone hints at the lesson the protagonist needs to learn, though they don't get it yet. What's the story really about?" },
      { title: "Set-Up", guidance: "Show the protagonist's life, flaws, and what needs fixing. What's broken that they don't see?" },
      { title: "Catalyst", guidance: "The life-changing event. What happens that sets the story in motion?" },
      { title: "Debate", guidance: "The protagonist hesitates. What makes them doubt whether to act?" },
      { title: "Break into Two", guidance: "They choose to enter a new world or approach. What decision launches Act Two?" },
      { title: "B Story", guidance: "A new character or relationship that carries the theme, often a love interest or mentor. Who helps them learn the lesson?" },
      { title: "Fun and Games", guidance: "The promise of the premise. What are the scenes readers picked up this book for?" },
      { title: "Midpoint", guidance: "A false victory or false defeat; the stakes are raised. What makes it impossible to turn back?" },
      { title: "Bad Guys Close In", guidance: "External enemies regroup and internal doubts grow. How does everything start to unravel?" },
      { title: "All Is Lost", guidance: "The lowest point, often with a 'whiff of death': something or someone is lost. What hits hardest?" },
      { title: "Dark Night of the Soul", guidance: "The protagonist wallows, then finally grasps the theme. What realisation pulls them up?" },
      { title: "Break into Three", guidance: "Armed with the lesson and the B Story's help, they find the solution. What's the new plan?" },
      { title: "Finale", guidance: "They execute the plan and prove they've changed. How do A and B stories come together?" },
      { title: "Final Image", guidance: "The opposite of the Opening Image. What does their transformed world look like?" },
    ],
  },
  {
    id: "heros-journey",
    name: "The Hero's Journey",
    summary: "Christopher Vogler's 12 stages, drawn from Joseph Campbell's monomyth.",
    bestFor: "Fantasy, adventure, sci-fi, and quest stories.",
    beats: [
      { title: "Ordinary World", guidance: "The hero's normal life before the adventure. What do they have, and what are they missing?" },
      { title: "Call to Adventure", guidance: "A challenge or quest is presented. What invitation or problem arrives?" },
      { title: "Refusal of the Call", guidance: "The hero hesitates out of fear or obligation. What holds them back?" },
      { title: "Meeting the Mentor", guidance: "Someone offers guidance, training, or a gift. Who is it, and what do they give?" },
      { title: "Crossing the Threshold", guidance: "The hero commits and enters the special world. What boundary do they cross?" },
      { title: "Tests, Allies, Enemies", guidance: "They learn the rules of the new world. Who becomes a friend, who becomes a foe?" },
      { title: "Approach to the Inmost Cave", guidance: "Preparing for the major challenge. What's the plan, and what doubts surface?" },
      { title: "The Ordeal", guidance: "The central crisis: a confrontation with their greatest fear. What do they face, and do they nearly fail?" },
      { title: "Reward", guidance: "Having survived, they seize the prize. What do they gain: an object, knowledge, reconciliation?" },
      { title: "The Road Back", guidance: "They head home, but the danger isn't over. What chases them, or what choice must they make?" },
      { title: "Resurrection", guidance: "A final test where everything is at stake. How do they prove they've been transformed?" },
      { title: "Return with the Elixir", guidance: "They return home changed, bringing something to share. What's different now?" },
    ],
  },
  {
    id: "seven-point",
    name: "Seven-Point Story Structure",
    summary: "Dan Wells' structure: plan the ending first, then build symmetrically toward it.",
    bestFor: "Plot-heavy stories, mysteries, and series with complex arcs.",
    beats: [
      { title: "Hook", guidance: "The starting state, the opposite of the resolution. Where does your protagonist begin, and why should readers care?" },
      { title: "Plot Turn 1", guidance: "Something introduces the conflict and changes the protagonist's world. What sets them on the path?" },
      { title: "Pinch Point 1", guidance: "Pressure applied: the antagonist shows their strength, forcing action. What goes wrong?" },
      { title: "Midpoint", guidance: "The protagonist moves from reaction to action. What makes them decide to fight back?" },
      { title: "Pinch Point 2", guidance: "More pressure: the plan fails, allies leave, all seems lost. What's the darkest moment?" },
      { title: "Plot Turn 2", guidance: "The protagonist gets the final piece needed to succeed. What do they discover or realise?" },
      { title: "Resolution", guidance: "The climax and ending: the protagonist achieves (or fails) their goal. Write this first, then make every beat lead here." },
    ],
  },
];

export function countBeats(template: OutlineTemplate): { chapters: number; scenes: number } {
  return {
    chapters: template.beats.length,
    scenes: template.beats.reduce((n, b) => n + (b.children?.length ?? 0), 0),
  };
}
