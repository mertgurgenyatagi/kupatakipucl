import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ForumImageThumb } from "./ForumImageThumb";

class FailingImageMock {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onerror?.());
  }
}

describe("ForumImageThumb", () => {
  const OriginalImage = window.Image;

  afterEach(() => {
    window.Image = OriginalImage;
  });

  it("shows a skeleton, then the real image once it's loaded — never an empty/invisible box", async () => {
    render(<ForumImageThumb src="/uploads/photo.png" />);
    expect(screen.getByTestId("forum-image-skeleton")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Resmi büyüt" }).querySelector("img")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("forum-image-skeleton")).not.toBeInTheDocument();
  });

  it("shows a fallback icon instead of a broken image when the thumbnail fails to load", async () => {
    window.Image = FailingImageMock as unknown as typeof window.Image;

    render(<ForumImageThumb src="/uploads/missing.png" />);
    await waitFor(() => expect(screen.getByTestId("forum-image-fallback")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Resmi büyüt" }).querySelector("img")).not.toBeInTheDocument();
  });

  it("opens the lightbox on click once the image has loaded", async () => {
    const { container } = render(<ForumImageThumb src="/uploads/photo.png" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Resmi büyüt" }).querySelector("img")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Resmi büyüt" }));
    // Two <img>s exist once the lightbox is open: the thumbnail (still
    // mounted behind it) and the full-size one — the full-size one is the
    // second.
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });

  it("shows a failure message in the lightbox too, when the image failed to load", async () => {
    window.Image = FailingImageMock as unknown as typeof window.Image;

    render(<ForumImageThumb src="/uploads/missing.png" />);
    await waitFor(() => expect(screen.getByTestId("forum-image-fallback")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Resmi büyüt" }));
    expect(screen.getByText("Resim yüklenemedi.")).toBeInTheDocument();
  });
});
