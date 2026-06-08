import { buildOmnivoiceApiUrl, getOmnivoiceRequestHeaders } from "@/lib/server/omnivoiceBackend";

const originalEnv = process.env;

describe("OmniVoice backend helpers", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OMNIVOICE_API_BASE_URL;
    delete process.env.OMNIVOICE_API_VERSION;
    process.env.OMNIVOICE_API_KEY = "test-key";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("builds the v4 API endpoint by default", () => {
    expect(buildOmnivoiceApiUrl("ping")).toBe("https://api.omnivoice.ai/v4/api/ping");
  });

  it("includes x-api-key and bearer auth headers", () => {
    expect(getOmnivoiceRequestHeaders("token")).toEqual({
      Authorization: "Bearer token",
      "x-api-key": "test-key"
    });
  });
});
