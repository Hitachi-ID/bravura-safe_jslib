import { Utils } from "jslib-common/misc/utils";

describe("Utils Service", () => {
  describe("getDomain", () => {
    it("should fail for invalid urls", () => {
      expect(Utils.getDomain(null)).toBeNull();
      expect(Utils.getDomain(undefined)).toBeNull();
      expect(Utils.getDomain(" ")).toBeNull();
      expect(Utils.getDomain('https://bit!:"_&ward.com')).toBeNull();
      expect(Utils.getDomain("bitwarden")).toBeNull();
    });

    it("should fail for data urls", () => {
      expect(Utils.getDomain("data:image/jpeg;base64,AAA")).toBeNull();
    });

    it("should handle urls without protocol", () => {
      expect(Utils.getDomain("safe.hitachi-id.net")).toBe("safe.hitachi-id.net");
      expect(Utils.getDomain("wrong://safe.hitachi-id.net")).toBe("safe.hitachi-id.net");
    });

    it("should handle valid urls", () => {
      expect(Utils.getDomain("https://bitwarden")).toBe("bitwarden");
      expect(Utils.getDomain("https://safe.hitachi-id.net")).toBe("safe.hitachi-id.net");
      expect(Utils.getDomain("http://safe.hitachi-id.net")).toBe("safe.hitachi-id.net");
      expect(Utils.getDomain("http://vault.safe.hitachi-id.net")).toBe("safe.hitachi-id.net");
      expect(
        Utils.getDomain("https://user:password@safe.hitachi-id.net:8080/password/sites?and&query#hash")
      ).toBe("safe.hitachi-id.net");
      expect(Utils.getDomain("https://bitwarden.unknown")).toBe("bitwarden.unknown");
    });

    it("should support localhost and IP", () => {
      expect(Utils.getDomain("https://localhost")).toBe("localhost");
      expect(Utils.getDomain("https://192.168.1.1")).toBe("192.168.1.1");
    });

    it("should reject invalid hostnames", () => {
      expect(Utils.getDomain("https://mywebsite.com$.mywebsite.com")).toBeNull();
      expect(Utils.getDomain("https://mywebsite.com!.mywebsite.com")).toBeNull();
    });
  });

  describe("getHostname", () => {
    it("should fail for invalid urls", () => {
      expect(Utils.getHostname(null)).toBeNull();
      expect(Utils.getHostname(undefined)).toBeNull();
      expect(Utils.getHostname(" ")).toBeNull();
      expect(Utils.getHostname('https://bit!:"_&ward.com')).toBeNull();
      expect(Utils.getHostname("bitwarden")).toBeNull();
    });

    it("should handle valid urls", () => {
      expect(Utils.getHostname("safe.hitachi-id.net")).toBe("safe.hitachi-id.net");
      expect(Utils.getHostname("https://safe.hitachi-id.net")).toBe("safe.hitachi-id.net");
      expect(Utils.getHostname("http://safe.hitachi-id.net")).toBe("safe.hitachi-id.net");
      expect(Utils.getHostname("http://vault.safe.hitachi-id.net")).toBe("vault.safe.hitachi-id.net");
    });

    it("should support localhost and IP", () => {
      expect(Utils.getHostname("https://localhost")).toBe("localhost");
      expect(Utils.getHostname("https://192.168.1.1")).toBe("192.168.1.1");
    });
  });

  describe("newGuid", () => {
    it("should create a valid guid", () => {
      const validGuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(Utils.newGuid()).toMatch(validGuid);
    });
  });
});
