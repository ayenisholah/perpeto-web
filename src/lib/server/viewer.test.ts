import { describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@ayenisholah/perpeto-api-client";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { viewerFrom } = await import("./api");

function user(roles: CurrentUser["roles"], demo?: boolean): CurrentUser {
  return {
    id: "u",
    tenant: { id: "t", display_name: "T", base_currency: "USD", state: "PAPER_ONLY" },
    status: "ACTIVE",
    display_name: null,
    email: null,
    roles,
    linked_providers: [],
    mfa_enrolled: false,
    ...(demo === undefined ? {} : { demo }),
  };
}

describe("viewerFrom", () => {
  it("makes the demo read-only whatever its roles", () => {
    for (const viewer of [viewerFrom(user(["VIEWER"], true), false, "c"), viewerFrom(user(["OWNER"]), true, "c")]) {
      expect(viewer).toMatchObject({ demo: true, canTrade: false, isOwner: false, readOnly: true });
    }
  });

  it("makes a Viewer-only account read-only", () => {
    expect(viewerFrom(user(["VIEWER"]), false, "c")).toMatchObject({ demo: false, readOnly: true, canTrade: false });
  });

  it("lets owners and traders trade, and approvers act without trading", () => {
    expect(viewerFrom(user(["OWNER", "TRADER", "APPROVER"]), false, "c")).toMatchObject({
      canTrade: true,
      isOwner: true,
      readOnly: false,
    });
    expect(viewerFrom(user(["APPROVER"]), false, "c")).toMatchObject({ canTrade: false, readOnly: false });
  });

  it("carries the session's CSRF token to the forms", () => {
    expect(viewerFrom(user(["OWNER"]), false, "token").csrf).toBe("token");
  });
});
