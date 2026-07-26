import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { Player } from "../profile/usePlayers";
import { MessageWithId } from "./useMessages";

const mockDeleteMessage = vi.fn();
const mockSearchMessages = vi.fn();

vi.mock("./deleteMessage", () => ({
  deleteMessage: (...args: unknown[]) => mockDeleteMessage(...args),
}));
vi.mock("./searchMessages", () => ({
  searchMessages: (...args: unknown[]) => mockSearchMessages(...args),
}));
vi.mock("./ChatComposer", () => ({
  ChatComposer: ({ uid, players }: { uid: string; players: Player[] }) => (
    <div>chat-composer:{uid}:{players.length}</div>
  ),
}));

import { ChatRoom } from "./ChatRoom";

const players: Player[] = [
  { uid: "me", firstName: "Mert", lastName: "Y.", photoURL: "", createdAt: 0 },
  { uid: "uid-ada", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
  { uid: "uid-kuzey", firstName: "Kuzey", lastName: "Demir", photoURL: "", createdAt: 2 },
];

function message(overrides: Partial<MessageWithId>): MessageWithId {
  return { id: "m1", uid: "uid-ada", text: "Merhaba", createdAt: Date.now(), ...overrides };
}

function renderRoom(overrides: Partial<Parameters<typeof ChatRoom>[0]> = {}) {
  return render(
    <ChatRoom
      uid="me"
      players={players}
      messages={[]}
      onLoadOlder={vi.fn()}
      loadingOlder={false}
      hasMoreOlder={false}
      typingUids={[]}
      onSelectParticipant={vi.fn()}
      {...overrides}
    />
  );
}

describe("ChatRoom", () => {
  beforeEach(() => {
    mockDeleteMessage.mockReset();
    mockSearchMessages.mockReset();
  });

  it("shows an empty state when there are no messages", () => {
    renderRoom();
    expect(screen.getByText("Henüz mesaj yok.")).toBeInTheDocument();
  });

  it("renders each message with the sender's resolved full name", () => {
    renderRoom({ messages: [message({ uid: "uid-ada", text: "Merhaba" })] });
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Merhaba")).toBeInTheDocument();
  });

  it("shows 'Silindi' (not the raw uid) when no matching player is found", () => {
    renderRoom({ messages: [message({ uid: "unknown-uid" })], players: [] });
    expect(screen.getByText("Silindi")).toBeInTheDocument();
    expect(screen.queryByText("unknown-uid")).not.toBeInTheDocument();
  });

  it("opens the participant popup when a name is clicked", () => {
    const onSelectParticipant = vi.fn();
    renderRoom({ messages: [message({ uid: "uid-ada" })], onSelectParticipant });
    fireEvent.click(screen.getByText("Ada Lovelace"));
    expect(onSelectParticipant).toHaveBeenCalledWith("uid-ada");
  });

  it("shows a delete button only on the current user's own messages", () => {
    renderRoom({
      messages: [message({ id: "mine", uid: "me", text: "benim mesajım" }), message({ id: "theirs", uid: "uid-ada", text: "onun mesajı" })],
    });
    expect(screen.getAllByRole("button", { name: "Mesajı sil" })).toHaveLength(1);
  });

  it("deletes a message on click and surfaces an error if it fails", async () => {
    mockDeleteMessage.mockRejectedValue(new Error("permission-denied"));
    renderRoom({ messages: [message({ id: "mine", uid: "me", text: "sil beni" })] });
    fireEvent.click(screen.getByRole("button", { name: "Mesajı sil" }));
    expect(mockDeleteMessage).toHaveBeenCalledWith("mine");
    expect(await screen.findByRole("alert")).toHaveTextContent("Mesaj silinemedi, tekrar deneyin.");
  });

  it("shows a placeholder instead of the text for a deleted message, with no delete button", () => {
    renderRoom({ messages: [message({ id: "gone", uid: "me", text: "gizli", deleted: true })] });
    expect(screen.getByText("Bu mesaj silindi.")).toBeInTheDocument();
    expect(screen.queryByText("gizli")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mesajı sil" })).not.toBeInTheDocument();
  });

  it("shows a date divider for the message list", () => {
    renderRoom({ messages: [message({})] });
    expect(screen.getByText("Bugün")).toBeInTheDocument();
  });

  it("shows a load-older button only when there's more history, and wires it up", () => {
    const onLoadOlder = vi.fn();
    const { rerender } = renderRoom({ messages: [message({})], hasMoreOlder: false, onLoadOlder });
    expect(screen.queryByText("Daha eski mesajları yükle")).not.toBeInTheDocument();

    rerender(
      <ChatRoom
        uid="me"
        players={players}
        messages={[message({})]}
        onLoadOlder={onLoadOlder}
        loadingOlder={false}
        hasMoreOlder={true}
        typingUids={[]}
        onSelectParticipant={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Daha eski mesajları yükle"));
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it("shows nothing on the typing line when nobody is typing", () => {
    renderRoom({ messages: [message({})], typingUids: [] });
    expect(screen.queryByText(/yazıyor/)).not.toBeInTheDocument();
  });

  it("names the one person typing", () => {
    renderRoom({ messages: [message({})], typingUids: ["uid-ada"] });
    expect(screen.getByText("Ada yazıyor…")).toBeInTheDocument();
  });

  it("summarizes three or more typists by count", () => {
    renderRoom({ messages: [message({})], typingUids: ["me", "uid-ada", "uid-kuzey"] });
    expect(screen.getByText("3 kişi yazıyor…")).toBeInTheDocument();
  });

  it("passes uid and players through to the composer", () => {
    renderRoom({ messages: [message({})] });
    expect(screen.getByText("chat-composer:me:3")).toBeInTheDocument();
  });

  describe("search", () => {
    it("opens a search input when the search button is clicked, and closes it again", () => {
      renderRoom({ messages: [message({})] });
      fireEvent.click(screen.getByRole("button", { name: "Sohbette ara" }));
      expect(screen.getByPlaceholderText("Sohbette ara…")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Aramayı kapat" }));
      expect(screen.queryByPlaceholderText("Sohbette ara…")).not.toBeInTheDocument();
    });

    it("searches and renders matching results", async () => {
      mockSearchMessages.mockResolvedValue([message({ id: "found", uid: "uid-ada", text: "aranan kelime" })]);
      renderRoom({ messages: [message({ text: "listedeki mesaj" })] });

      fireEvent.click(screen.getByRole("button", { name: "Sohbette ara" }));
      fireEvent.change(screen.getByPlaceholderText("Sohbette ara…"), { target: { value: "aranan" } });

      await waitFor(() => expect(mockSearchMessages).toHaveBeenCalledWith("aranan"));
      expect(await screen.findByText("aranan kelime")).toBeInTheDocument();
      expect(screen.queryByText("listedeki mesaj")).not.toBeInTheDocument();
    });

    it("shows a no-results message when a search comes back empty", async () => {
      mockSearchMessages.mockResolvedValue([]);
      renderRoom({ messages: [] });
      fireEvent.click(screen.getByRole("button", { name: "Sohbette ara" }));
      fireEvent.change(screen.getByPlaceholderText("Sohbette ara…"), { target: { value: "yok böyle bir şey" } });
      expect(await screen.findByText("Sonuç bulunamadı.")).toBeInTheDocument();
    });
  });

  it("tints a message that @mentions the current user", () => {
    renderRoom({
      messages: [message({ id: "mention", uid: "uid-ada", text: "@Mert bak buna", mentionedUids: ["me"] })],
    });
    expect(screen.getByText("@Mert")).toHaveClass("text-brass");
  });
});
