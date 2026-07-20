// src/pages/ChatPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ChatPage } from "./ChatPage";

const mockUseAuth = vi.fn();
const mockUseVisibilityState = vi.fn();
const mockUseMessages = vi.fn();
const mockUsePlayers = vi.fn();

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../chat/useMessages", () => ({
  useMessages: () => mockUseMessages(),
}));

vi.mock("../profile/usePlayers", () => ({
  usePlayers: () => mockUsePlayers(),
}));

vi.mock("../chat/ChatRoom", () => ({
  ChatRoom: ({ uid }: { uid: string }) => <div>chat-room:{uid}</div>,
}));

describe("ChatPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { uid: "uid1" } });
    mockUseMessages.mockReturnValue({ messages: [], loading: false });
    mockUsePlayers.mockReturnValue({ players: [], loading: false });
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    render(<ChatPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("renders nothing while messages or players are loading", () => {
    mockUseVisibilityState.mockReturnValue("NST_LI");
    mockUseMessages.mockReturnValue({ messages: [], loading: true });
    const { container } = render(<ChatPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders ChatRoom with the current user's uid once loaded", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    render(<ChatPage />);
    expect(screen.getByText("chat-room:uid1")).toBeInTheDocument();
  });
});
