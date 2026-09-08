import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { GracePeriodBanner } from "./GracePeriodBanner";

function renderBanner(variant: "loggedout" | "loggedin") {
  return render(
    <MemoryRouter>
      <GracePeriodBanner variant={variant} />
    </MemoryRouter>
  );
}

describe("GracePeriodBanner", () => {
  it("loggedout variant shows the Google sign-in CTA", () => {
    renderBanner("loggedout");
    expect(screen.getByText("Google ile giriş yap")).toBeInTheDocument();
    expect(screen.queryByText("Tahmininizi gönderin")).not.toBeInTheDocument();
  });

  it("loggedin variant links to /predictions", () => {
    renderBanner("loggedin");
    const link = screen.getByText("Tahmininizi gönderin");
    expect(link.closest("a")).toHaveAttribute("href", "/predictions");
    expect(screen.queryByText("Google ile giriş yap")).not.toBeInTheDocument();
  });
});
