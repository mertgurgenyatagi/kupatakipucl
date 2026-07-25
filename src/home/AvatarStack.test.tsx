import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AvatarStack } from "./AvatarStack";
import type { Player } from "../profile/usePlayers";

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `p${i}`,
    firstName: `Ad${i}`,
    lastName: `Soyad${i}`,
    photoURL: `https://example.com/${i}.jpg`,
    createdAt: 0,
  }));
}

describe("AvatarStack", () => {
  it("shows no overflow badge when there are 3 or fewer players", () => {
    render(<AvatarStack players={makePlayers(3)} />);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("shows the remaining count past the first 3 players", () => {
    render(<AvatarStack players={makePlayers(11)} />);
    expect(screen.getByText("+8")).toBeInTheDocument();
  });

  it("renders nothing extra for zero players", () => {
    const { container } = render(<AvatarStack players={[]} />);
    expect(container.querySelectorAll("[data-slot=avatar]")).toHaveLength(0);
  });
});
