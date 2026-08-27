import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SlowLoadNotice, SLOW_LOAD_MESSAGE } from "./slow-load-notice";

describe("SlowLoadNotice", () => {
  it("renders the exact given wording", () => {
    render(<SlowLoadNotice />);
    expect(screen.getByText(SLOW_LOAD_MESSAGE)).toBeInTheDocument();
  });
});
