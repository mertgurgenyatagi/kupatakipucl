import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

// AvatarImage renders with alt="" (decorative, matching every real call
// site) — an empty alt means no implicit ARIA "img" role, so these query by
// data-slot instead of getByRole("img").
describe("AvatarImage", () => {
  it("fades in once the photo has loaded, instead of popping in instantly", async () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="/photo.png" alt="" />
        <AvatarFallback>MG</AvatarFallback>
      </Avatar>
    );
    await waitFor(() => expect(container.querySelector('[data-slot="avatar-image"]')).toBeInTheDocument());
    expect(container.querySelector('[data-slot="avatar-image"]')).toHaveClass("animate-cotton-fade");
  });

  it("shows the fallback, not a broken/empty image, before the photo has loaded", () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="/photo.png" alt="" />
        <AvatarFallback>MG</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("MG")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="avatar-image"]')).not.toBeInTheDocument();
  });
});
