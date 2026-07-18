import { describe, it, expect, beforeEach } from "vitest";
import {
  getCachedProfileId,
  setCachedProfileId,
  __resetIdentityCacheForTests,
  IDENTITY_CACHE_MAX_ENTRIES,
} from "./identity-cache";

beforeEach(() => {
  __resetIdentityCacheForTests();
});

describe("identity cache", () => {
  it("returns undefined on a miss", () => {
    expect(getCachedProfileId("auth-1")).toBeUndefined();
  });

  it("returns the cached profile id on a hit", () => {
    setCachedProfileId("auth-1", "profile-1");
    expect(getCachedProfileId("auth-1")).toBe("profile-1");
  });

  it("keeps entries isolated per auth user", () => {
    setCachedProfileId("auth-1", "profile-1");
    setCachedProfileId("auth-2", "profile-2");
    expect(getCachedProfileId("auth-1")).toBe("profile-1");
    expect(getCachedProfileId("auth-2")).toBe("profile-2");
  });

  it("evicts the oldest entry once the cap is reached", () => {
    for (let i = 0; i < IDENTITY_CACHE_MAX_ENTRIES + 1; i += 1) {
      setCachedProfileId(`auth-${i}`, `profile-${i}`);
    }
    expect(getCachedProfileId("auth-0")).toBeUndefined();
    expect(getCachedProfileId(`auth-${IDENTITY_CACHE_MAX_ENTRIES}`)).toBe(
      `profile-${IDENTITY_CACHE_MAX_ENTRIES}`,
    );
  });

  it("overwrites an existing entry without growing the cache", () => {
    setCachedProfileId("auth-1", "profile-1");
    setCachedProfileId("auth-1", "profile-1b");
    expect(getCachedProfileId("auth-1")).toBe("profile-1b");
  });
});
