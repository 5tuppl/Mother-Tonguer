import { getMongolianPronunciationHint, transliterateMongolianCyrillic } from "@/lib/pronunciation";

describe("Mongolian pronunciation helpers", () => {
  it("transliterates common Mongolian Cyrillic text", () => {
    expect(transliterateMongolianCyrillic("Сайн байна уу")).toBe("sain baina uu");
  });

  it("adds lightweight reading breaks", () => {
    expect(getMongolianPronunciationHint("Монгол хэл")).toBe("mon-gol khel");
  });
});
