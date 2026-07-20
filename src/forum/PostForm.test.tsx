// src/forum/PostForm.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockCreatePost = vi.fn();

vi.mock("./createPost", () => ({
  createPost: (...args: unknown[]) => mockCreatePost(...args),
}));

import { PostForm } from "./PostForm";

describe("PostForm", () => {
  beforeEach(() => {
    mockCreatePost.mockReset();
  });

  it("submits the typed text with the given parentId, clears the input, and calls onPosted", async () => {
    mockCreatePost.mockResolvedValue(undefined);
    const onPosted = vi.fn();
    render(<PostForm uid="uid1" parentId="thread-1" onPosted={onPosted} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Yeni gönderi" } });
    fireEvent.click(screen.getByText("Paylaş"));
    expect(mockCreatePost).toHaveBeenCalledWith("uid1", "Yeni gönderi", null, "thread-1");
    await waitFor(() => expect(textarea).toHaveValue(""));
    expect(onPosted).toHaveBeenCalledTimes(1);
  });

  it("does not submit when both text and image are empty", () => {
    render(<PostForm uid="uid1" parentId={null} onPosted={vi.fn()} />);
    fireEvent.click(screen.getByText("Paylaş"));
    expect(mockCreatePost).not.toHaveBeenCalled();
  });

  it("shows an inline error and preserves the typed text when posting fails", async () => {
    mockCreatePost.mockRejectedValue(new Error("permission-denied"));
    render(<PostForm uid="uid1" parentId={null} onPosted={vi.fn()} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Kaybolmasın" } });
    fireEvent.click(screen.getByText("Paylaş"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Gönderi paylaşılamadı, tekrar deneyin.");
    expect(textarea).toHaveValue("Kaybolmasın");
  });
});
