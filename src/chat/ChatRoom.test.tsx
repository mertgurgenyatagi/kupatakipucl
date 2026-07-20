// src/chat/ChatRoom.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockSendMessage = vi.fn();

vi.mock("./sendMessage", () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

import { ChatRoom } from "./ChatRoom";

const players = [
  { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
];

describe("ChatRoom", () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
  });

  it("renders each message with the sender's resolved full name", () => {
    render(
      <ChatRoom
        uid="uid1"
        players={players}
        messages={[{ id: "msg1", uid: "uid1", text: "Merhaba", createdAt: 100 }]}
      />
    );
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/Merhaba/)).toBeInTheDocument();
  });

  it("falls back to the raw uid when no matching player is found", () => {
    render(
      <ChatRoom
        uid="uid1"
        players={[]}
        messages={[{ id: "msg1", uid: "unknown-uid", text: "Merhaba", createdAt: 100 }]}
      />
    );
    expect(screen.getByText(/unknown-uid/)).toBeInTheDocument();
  });

  it("sends the typed message and clears the input on success", async () => {
    mockSendMessage.mockResolvedValue(undefined);
    render(<ChatRoom uid="uid1" players={players} messages={[]} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Yeni mesaj" } });
    fireEvent.click(screen.getByText("Gönder"));
    expect(mockSendMessage).toHaveBeenCalledWith("uid1", "Yeni mesaj");
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("does not call sendMessage for an empty input", () => {
    render(<ChatRoom uid="uid1" players={players} messages={[]} />);
    fireEvent.click(screen.getByText("Gönder"));
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("shows an inline error and keeps the typed text when sending fails", async () => {
    mockSendMessage.mockRejectedValue(new Error("permission-denied"));
    render(<ChatRoom uid="uid1" players={players} messages={[]} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Kaybolmasın" } });
    fireEvent.click(screen.getByText("Gönder"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Mesaj gönderilemedi, tekrar deneyin.");
    expect(input).toHaveValue("Kaybolmasın");
  });
});
