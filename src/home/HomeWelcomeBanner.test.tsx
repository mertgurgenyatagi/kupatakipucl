import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomeWelcomeBanner } from "./HomeWelcomeBanner";
import { Player } from "../profile/usePlayers";

const mockUseCountdown = vi.fn();
vi.mock("./useCountdown", () => ({
  useCountdown: () => mockUseCountdown(),
}));

const me: Player = { uid: "me", firstName: "Mert", lastName: "Y.", photoURL: "", createdAt: 0 };

function renderBanner(showCta: boolean) {
  return render(
    <MemoryRouter>
      <HomeWelcomeBanner me={me} showCta={showCta} />
    </MemoryRouter>
  );
}

describe("HomeWelcomeBanner", () => {
  beforeEach(() => {
    mockUseCountdown.mockReturnValue({ days: 4, hours: 3, minutes: 2, seconds: 1, done: false });
  });

  it("greets the signed-in user by first name, bolded", () => {
    renderBanner(true);
    const greeting = screen.getByText((_, el) => el?.textContent === "Hoş geldin, Mert.");
    expect(greeting).toBeInTheDocument();
    expect(screen.getByText("Mert")).toHaveClass("font-bold");
  });

  it("shows the predictions CTA when showCta is true", () => {
    renderBanner(true);
    expect(screen.getByRole("link", { name: /Tahminini Yap/ })).toHaveAttribute("href", "/predictions");
  });

  it("hides the CTA when showCta is false", () => {
    renderBanner(false);
    expect(screen.queryByRole("link", { name: /Tahminini Yap/ })).not.toBeInTheDocument();
  });

  it("shows the countdown digits when not yet done", () => {
    renderBanner(true);
    expect(screen.getByText("04")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("hides the countdown once it's done", () => {
    mockUseCountdown.mockReturnValue({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
    renderBanner(true);
    expect(screen.queryByText("Tahminlerin Kapanmasına")).not.toBeInTheDocument();
  });
});
