import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ProfileForm } from "./ProfileForm";

const mockSaveProfile = vi.fn();

vi.mock("./useProfile", () => ({
  saveProfile: (...args: unknown[]) => mockSaveProfile(...args),
}));

describe("ProfileForm", () => {
  beforeEach(() => {
    mockSaveProfile.mockReset();
  });

  it("shows an error and does not save when no photo is chosen", async () => {
    render(<ProfileForm uid="uid1" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Mert" } });
    fireEvent.change(screen.getByLabelText("Soyad"), { target: { value: "G" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Lütfen bir profil fotoğrafı seçin."
    );
    expect(mockSaveProfile).not.toHaveBeenCalled();
  });

  it("calls saveProfile and onSaved when submitted with a photo", async () => {
    const savedProfile = { firstName: "Mert", lastName: "G", photoURL: "url", createdAt: 1 };
    mockSaveProfile.mockResolvedValue(savedProfile);
    const onSaved = vi.fn();
    render(<ProfileForm uid="uid1" onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Mert" } });
    fireEvent.change(screen.getByLabelText("Soyad"), { target: { value: "G" } });
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Profil fotoğrafı"), { target: { files: [file] } });
    fireEvent.click(screen.getByText("Kaydet"));

    await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledWith("uid1", "Mert", "G", file));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedProfile));
  });

  it("shows an inline error when saving fails", async () => {
    mockSaveProfile.mockRejectedValue(new Error("network"));
    render(<ProfileForm uid="uid1" onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Mert" } });
    fireEvent.change(screen.getByLabelText("Soyad"), { target: { value: "G" } });
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Profil fotoğrafı"), { target: { files: [file] } });
    fireEvent.click(screen.getByText("Kaydet"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Profil kaydedilemedi, tekrar deneyin."
    );
  });
});
