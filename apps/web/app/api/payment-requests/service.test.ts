import { describe, expect, it } from "vitest";
import { getFinalStatus } from "./service";

describe("payment request decision combination", () => {
  it("executes only when policy auto-approves and risk is low", () => {
    expect(getFinalStatus("AUTO_APPROVE", "LOW")).toBe("Executed");
  });

  it("routes to approval when policy needs approval and risk is low", () => {
    expect(getFinalStatus("NEEDS_APPROVAL", "LOW")).toBe("Needs approval");
  });

  it("routes to approval when policy auto-approves and risk is medium", () => {
    expect(getFinalStatus("AUTO_APPROVE", "MEDIUM")).toBe("Needs approval");
  });

  it("blocks when policy blocks even if risk is low", () => {
    expect(getFinalStatus("BLOCK", "LOW")).toBe("Blocked");
  });

  it("blocks when risk is high even if policy auto-approves", () => {
    expect(getFinalStatus("AUTO_APPROVE", "HIGH")).toBe("Blocked");
  });
});

