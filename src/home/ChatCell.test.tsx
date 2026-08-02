import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatCell } from "./ChatCell";
import type { MyLobby } from "../lobbies/useMyLobbies";

const PLAYERS = [
  { uid: "uid1", firstName: "A", lastName: "B", photoURL: "", createdAt: 1 },
  { uid: "uid2", firstName: "C", lastName: "D", photoURL: "", createdAt: 1 },
];

const LOBBY_MESSAGES = {
  messages: [],
  loading: false,
  loadOlder: vi.fn(),
  loadingOlder: false,
  hasMoreOlder: false,
};

function baseProps() {
  return {
    myUid: "uid1",
    players: PLAYERS,
    myLobbies: [] as MyLobby[],
    sohbetLobbyId: null,
    onChangeSohbetLobby: vi.fn(),
    onOpenLobbyManagement: vi.fn(),
    sohbetLobbyMembers: [],
    sohbetLobbyMessages: LOBBY_MESSAGES,
    messages: [],
    onLoadOlderMessages: vi.fn(),
    loadingOlderMessages: false,
    hasMoreOlderMessages: false,
    onlineCount: 3,
    typingUids: [],
    onSelectParticipant: vi.fn(),
  };
}

describe("ChatCell", () => {
  it("shows the online count", () => {
    render(<ChatCell {...baseProps()} />);
    expect(screen.getByText(/3 çevrimiçi/)).toBeInTheDocument();
  });

  it("shows the Genel (global chat) label when no Special Lobby is active", () => {
    render(<ChatCell {...baseProps()} />);
    expect(screen.getByText("Genel")).toBeInTheDocument();
  });

  it("does not render a settings gear when no Special Lobby is active", () => {
    render(<ChatCell {...baseProps()} />);
    expect(screen.queryByLabelText("Özel lobi ayarları")).not.toBeInTheDocument();
  });

  it("shows the settings gear once a Special Lobby is active", () => {
    const lobby: MyLobby = {
      id: "lobby1",
      name: "Arkadaşlar",
      createdByUid: "uid1",
      createdAt: 1,
      myJoinedAt: 1,
      memberUids: ["uid1"],
    };
    render(<ChatCell {...baseProps()} myLobbies={[lobby]} sohbetLobbyId="lobby1" />);
    expect(screen.getByLabelText("Özel lobi ayarları")).toBeInTheDocument();
  });
});
