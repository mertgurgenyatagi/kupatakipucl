import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ForumImageThumb } from "./ForumImageThumb";

describe("ForumImageThumb", () => {
  it("starts the thumbnail transparent, then fades it in once it loads", () => {
    render(<ForumImageThumb src="/uploads/photo.png" />);
    const img = screen.getByRole("button", { name: "Resmi büyüt" }).querySelector("img")!;
    expect(img).toHaveClass("opacity-0");

    fireEvent.load(img);
    expect(img).toHaveClass("opacity-100");
  });

  it("shows a fallback icon instead of a broken image when the thumbnail fails to load", () => {
    render(<ForumImageThumb src="/uploads/missing.png" />);
    const img = screen.getByRole("button", { name: "Resmi büyüt" }).querySelector("img")!;

    fireEvent.error(img);

    expect(screen.getByTestId("forum-image-fallback")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resmi büyüt" })?.querySelector("img")).not.toBeInTheDocument();
  });

  it("still opens the lightbox on click, and shows a failure message there if the full image fails too", () => {
    const { container } = render(<ForumImageThumb src="/uploads/photo.png" />);
    fireEvent.click(screen.getByRole("button", { name: "Resmi büyüt" }));

    // Two <img>s exist once the lightbox is open: the thumbnail and the
    // full-size one — the full-size one is the second.
    const fullImg = container.querySelectorAll("img")[1];
    fireEvent.error(fullImg);

    expect(screen.getByText("Resim yüklenemedi.")).toBeInTheDocument();
  });
});
