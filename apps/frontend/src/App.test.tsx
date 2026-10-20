import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("shows the initial project foundation", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Azure Weather" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Initial project foundation",
    );
  });
});
