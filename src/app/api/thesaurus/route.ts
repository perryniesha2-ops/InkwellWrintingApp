import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { MAX_QUERY_LENGTH } from "@/lib/thesaurus";
import { lookupWord, ThesaurusError } from "@/lib/thesaurus.server";

/** Synonyms and related words. Query: ?word= (a word or a phrase of up to four words). */
export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const word = (new URL(req.url).searchParams.get("word") ?? "").trim();
  if (!word || word.length > MAX_QUERY_LENGTH || word.split(/\s+/).length > 4) {
    return NextResponse.json({ error: "Look up a word or a short phrase." }, { status: 400 });
  }

  try {
    const result = await lookupWord(word, { signal: req.signal });
    // The same word always gets the same results, so the browser can keep them.
    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=86400" } });
  } catch (err) {
    if (err instanceof ThesaurusError) {
      return NextResponse.json({ error: "The thesaurus service isn't responding. Try again in a moment." }, { status: 502 });
    }
    throw err;
  }
}
