import { describe, expect, it } from "vitest";
import { SUGGESTED_QUESTIONS } from "@/components/chat/suggested-questions";

describe("SUGGESTED_QUESTIONS (Russian card label -> canonical English mock-retrieval query)", () => {
  it("gives every suggestion a unique id, a Russian label, and a distinct English query", () => {
    const ids = new Set(SUGGESTED_QUESTIONS.map((q) => q.id));
    expect(ids.size).toBe(SUGGESTED_QUESTIONS.length);

    for (const suggestion of SUGGESTED_QUESTIONS) {
      expect(suggestion.label.length).toBeGreaterThan(0);
      expect(suggestion.query.length).toBeGreaterThan(0);
      // The label is Russian display copy; the query is the literal string
      // sent to the (English-oriented, lexical) mock backend and shown in
      // the chat transcript. They must stay visibly distinct so a click
      // never silently pretends to be real multilingual retrieval.
      expect(suggestion.label).not.toBe(suggestion.query);
      expect(/[а-яё]/i.test(suggestion.label)).toBe(true);
      expect(/^[a-z0-9\s.,'?-]+$/i.test(suggestion.query)).toBe(true);
    }
  });
});
