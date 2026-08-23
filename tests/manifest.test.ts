import { describe, expect, it } from "vitest";
import { getDocumentBySlug, getDocumentCount, listDocuments } from "@/lib/rag/manifest";

describe("corpus manifest (single source of truth for the sidebar count + Documents browser)", () => {
  it("lists exactly the 5 demo documents with a non-empty description and at least one section each", async () => {
    const documents = await listDocuments();
    expect(documents).toHaveLength(5);
    for (const doc of documents) {
      expect(doc.slug.length).toBeGreaterThan(0);
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.description.length).toBeGreaterThan(0);
      expect(doc.sectionCount).toBeGreaterThan(0);
    }
  });

  it("getDocumentCount matches listDocuments()'s length, so the sidebar can never drift from the Documents page", async () => {
    const [documents, count] = await Promise.all([listDocuments(), getDocumentCount()]);
    expect(count).toBe(documents.length);
  });

  it("getDocumentBySlug returns full section content for a known slug and null for an unknown one", async () => {
    const [first] = await listDocuments();
    const doc = await getDocumentBySlug(first.slug);

    expect(doc).not.toBeNull();
    expect(doc!.sections.length).toBe(doc!.sectionCount);
    expect(doc!.sections.every((s) => s.heading.length > 0 && s.excerpt.length > 0)).toBe(true);
    expect(await getDocumentBySlug("not-a-real-document")).toBeNull();
  });
});
