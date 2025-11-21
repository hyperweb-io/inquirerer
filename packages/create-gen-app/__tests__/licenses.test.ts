import { renderLicense, isSupportedLicense, listSupportedLicenses } from "../src/licenses";

describe("license templates", () => {
  it("renders MIT license with author and email", () => {
    const content = renderLicense("MIT", {
      author: "Test User",
      email: "test@example.com",
      year: "2099",
    });
    expect(content).toContain("Test User");
    expect(content).toContain("<test@example.com>");
    expect(content).toContain("2099");
  });

  it("falls back when license not supported", () => {
    expect(renderLicense("UNKNOWN", {})).toBeNull();
    expect(isSupportedLicense("UNKNOWN")).toBe(false);
  });

  it("lists supported licenses", () => {
    const supported = listSupportedLicenses();
    expect(supported).toEqual(expect.arrayContaining(["MIT", "APACHE-2.0", "ISC"]));
  });
});

