import { getDefaultVoiceId, getLanguage } from "@/lib/languages";

describe("language metadata", () => {
  it("keeps Mongolian as a first-class target", () => {
    expect(getLanguage("mn").nativeName).toBe("Монгол");
    expect(getDefaultVoiceId("mn")).toBe("mn-MN-YesuiNeural");
  });

  it("never resolves auto as a target voice", () => {
    expect(getDefaultVoiceId("auto")).toBe("mn-MN-YesuiNeural");
  });
});
