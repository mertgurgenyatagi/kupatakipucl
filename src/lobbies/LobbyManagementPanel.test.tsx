// src/lobbies/LobbyManagementPanel.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockRenameLobby = vi.fn();
const mockGenerateLobbyInvite = vi.fn();
const mockLeaveLobby = vi.fn();
const mockRemoveMember = vi.fn();
const mockDeleteLobby = vi.fn();

vi.mock("./renameLobby", () => ({ renameLobby: (...args: unknown[]) => mockRenameLobby(...args) }));
vi.mock("./generateLobbyInvite", () => ({ generateLobbyInvite: (...args: unknown[]) => mockGenerateLobbyInvite(...args) }));
vi.mock("./leaveLobby", () => ({ leaveLobby: (...args: unknown[]) => mockLeaveLobby(...args) }));
vi.mock("./removeMember", () => ({ removeMember: (...args: unknown[]) => mockRemoveMember(...args) }));
vi.mock("./deleteLobby", () => ({ deleteLobby: (...args: unknown[]) => mockDeleteLobby(...args) }));

import { LobbyManagementPanel } from "./LobbyManagementPanel";
import { LobbyWithId, LobbyMember } from "./lobbyTypes";
import { Player } from "../profile/usePlayers";

const lobby: LobbyWithId = { id: "lobby1", name: "Fener Grubu", createdByUid: "creator1", createdAt: 0 };
const members: LobbyMember[] = [
  { uid: "creator1", joinedAt: 0, viaInviteId: null },
  { uid: "uid2", joinedAt: 100, viaInviteId: "i1" },
];
const players: Player[] = [
  { uid: "creator1", firstName: "Ahmet", lastName: "Y", photoURL: "", createdAt: 0 },
  { uid: "uid2", firstName: "Zeynep", lastName: "K", photoURL: "", createdAt: 0 },
];

function renderPanel(myUid = "creator1") {
  return render(
    <LobbyManagementPanel
      lobby={lobby}
      members={members}
      players={players}
      myUid={myUid}
      myFirstName={myUid === "creator1" ? "Ahmet" : "Zeynep"}
      open={true}
      onOpenChange={vi.fn()}
      onLeft={vi.fn()}
      onDeleted={vi.fn()}
    />
  );
}

describe("LobbyManagementPanel", () => {
  beforeEach(() => {
    mockRenameLobby.mockReset().mockResolvedValue(undefined);
    mockGenerateLobbyInvite.mockReset().mockResolvedValue("invite1");
    mockLeaveLobby.mockReset().mockResolvedValue(undefined);
    mockRemoveMember.mockReset().mockResolvedValue(undefined);
    mockDeleteLobby.mockReset().mockResolvedValue(undefined);
  });

  it("renames on blur when the name changed", async () => {
    renderPanel();
    const input = screen.getByDisplayValue("Fener Grubu");
    fireEvent.change(input, { target: { value: "Yeni İsim" } });
    fireEvent.blur(input);
    await waitFor(() => expect(mockRenameLobby).toHaveBeenCalledWith("lobby1", "creator1", "Ahmet", "Yeni İsim"));
  });

  it("shows the invite link once generated", async () => {
    renderPanel();
    fireEvent.click(screen.getByText("Davet linki oluştur"));
    await waitFor(() => expect(mockGenerateLobbyInvite).toHaveBeenCalledWith("lobby1", "creator1"));
    await waitFor(() => expect(screen.getByDisplayValue(/#\/join\/invite1$/)).toBeInTheDocument());
  });

  it("shows the crown next to the creator", () => {
    renderPanel();
    expect(screen.getByLabelText("Kurucu")).toBeInTheDocument();
  });

  it("only shows a remove button next to non-creator members when the creator is viewing", () => {
    renderPanel("creator1");
    expect(screen.getAllByText("Çıkar")).toHaveLength(1);
  });

  it("hides remove buttons entirely for a non-creator viewer", () => {
    renderPanel("uid2");
    expect(screen.queryByText("Çıkar")).toBeNull();
  });

  it("only shows the delete button for the creator", () => {
    renderPanel("uid2");
    expect(screen.queryByText("Özel lobiyi sil")).toBeNull();
  });

  it("leaves without a confirmation dialog", async () => {
    renderPanel();
    fireEvent.click(screen.getByText("Özel lobiden ayrıl"));
    await waitFor(() => expect(mockLeaveLobby).toHaveBeenCalledTimes(1));
  });

  it("requires confirmation before deleting", async () => {
    renderPanel();
    fireEvent.click(screen.getByText("Özel lobiyi sil"));
    expect(mockDeleteLobby).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Evet, sil"));
    await waitFor(() => expect(mockDeleteLobby).toHaveBeenCalledWith("lobby1"));
  });

  it("shows the delete error inside the still-open confirmation dialog when deleteLobby fails", async () => {
    mockDeleteLobby.mockReset().mockRejectedValue(new Error("nope"));
    renderPanel();
    fireEvent.click(screen.getByText("Özel lobiyi sil"));
    fireEvent.click(screen.getByText("Evet, sil"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Özel lobi silinemedi, tekrar deneyin."));
    expect(screen.getByText("Özel lobiyi silmek istediğine emin misin?")).toBeInTheDocument();
  });
});
