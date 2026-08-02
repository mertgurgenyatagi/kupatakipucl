import { describe, it, expect } from "vitest";
import { fullName, firstNameOnly, initials, avatarSrc, DELETED_ACCOUNT_LABEL, DELETED_ACCOUNT_AVATAR } from "./deletedAccount";

describe("fullName", () => {
  it("joins first and last name when both are present", () => {
    expect(fullName({ firstName: "Ada", lastName: "Lovelace" })).toBe("Ada Lovelace");
  });

  it("falls back to first-name-only when lastName is absent (logged-out data)", () => {
    expect(fullName({ firstName: "Ada" })).toBe("Ada");
  });

  it("returns the deleted-account label when the player itself is null or undefined", () => {
    expect(fullName(null)).toBe(DELETED_ACCOUNT_LABEL);
    expect(fullName(undefined)).toBe(DELETED_ACCOUNT_LABEL);
  });
});

describe("firstNameOnly", () => {
  it("returns just the first name", () => {
    expect(firstNameOnly({ firstName: "Ada" })).toBe("Ada");
  });

  it("returns the deleted-account label when null", () => {
    expect(firstNameOnly(null)).toBe(DELETED_ACCOUNT_LABEL);
  });
});

describe("initials", () => {
  it("returns a two-letter monogram when both names are present", () => {
    expect(initials({ firstName: "Ada", lastName: "Lovelace" })).toBe("AL");
  });

  it("returns a single first-initial when lastName is absent (logged-out data)", () => {
    expect(initials({ firstName: "Ada" })).toBe("A");
  });

  it("returns a bare question mark for a deleted/missing account", () => {
    expect(initials(null)).toBe("?");
    expect(initials(undefined)).toBe("?");
  });
});

describe("avatarSrc", () => {
  it("returns the player's photo URL", () => {
    expect(avatarSrc({ photoURL: "a.png" })).toBe("a.png");
  });

  it("returns the deleted-account avatar when null", () => {
    expect(avatarSrc(null)).toBe(DELETED_ACCOUNT_AVATAR);
  });
});
