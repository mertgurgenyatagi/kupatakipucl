import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LobbySwitcher, getLobbySwitcherLabel } from "./LobbySwitcher";
import { MyLobby } from "./useMyLobbies";

const lobbyA: MyLobby = { id: "lobbyA", name: "A Grubu", createdByUid: "c1", createdAt: 1, myJoinedAt: 100, memberUids: ["c1"] };
const lobbyB: MyLobby = { id: "lobbyB", name: "B Grubu", createdByUid: "c2", createdAt: 2, myJoinedAt: 200, memberUids: ["c2"] };

describe("getLobbySwitcherLabel", () => {
  it("returns Genel when current is null and the user has lobbies", () => {
    expect(getLobbySwitcherLabel([lobbyA], null, "Sohbet")).toBe("Genel");
  });

  it("returns the current lobby's name", () => {
    expect(getLobbySwitcherLabel([lobbyA, lobbyB], "lobbyA", "Sohbet")).toBe("A Grubu");
  });

  it("falls back to the cell's own title if the current id isn't in options", () => {
    expect(getLobbySwitcherLabel([lobbyA], "missing", "Sohbet")).toBe("Sohbet");
  });

  // There is nothing to contrast "Genel" against until a special lobby
  // exists, so the cell keeps its normal title.
  it("keeps the cell's own title when the user belongs to no lobbies", () => {
    expect(getLobbySwitcherLabel([], null, "Sohbet")).toBe("Sohbet");
    expect(getLobbySwitcherLabel([], null, "Katılımcılar")).toBe("Katılımcılar");
  });
});

describe("LobbySwitcher", () => {
  it("renders nothing when the user has no lobbies", () => {
    const { container } = render(<LobbySwitcher options={[]} current={null} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an icon-only button, no label text", () => {
    render(<LobbySwitcher options={[lobbyA]} current={null} onChange={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Görünümü değiştir" });
    expect(button).not.toHaveTextContent("Genel");
    expect(screen.queryByText("A Grubu")).not.toBeInTheDocument();
  });

  it("cycles from Genel to the first lobby on click", () => {
    const onChange = vi.fn();
    render(<LobbySwitcher options={[lobbyA, lobbyB]} current={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("lobbyA");
  });

  it("cycles from the last lobby back to Genel", () => {
    const onChange = vi.fn();
    render(<LobbySwitcher options={[lobbyA, lobbyB]} current="lobbyB" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("cycles from one lobby to the next", () => {
    const onChange = vi.fn();
    render(<LobbySwitcher options={[lobbyA, lobbyB]} current="lobbyA" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("lobbyB");
  });
});
