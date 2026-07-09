import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Browse from "./Browse";
import { useAuth } from "@/contexts/AuthContext";
import { getTripDraft, clearTripDraft } from "@/lib/tripDraft";
import { api } from "@/lib/api";

// AuthContext, the trip-draft sessionStorage helpers, and the API client are
// mocked so these tests only exercise Browse.jsx's own rendering/interaction
// logic, not real network calls or real sessionStorage.
jest.mock("@/contexts/AuthContext");
jest.mock("@/lib/tripDraft");
jest.mock("@/lib/api", () => ({
  api: { get: jest.fn() },
}));

const DRAFT = { city: "Raipur", startDate: "2026-08-01", endDate: "2026-08-03" };

function renderBrowse() {
  return render(
    <MemoryRouter>
      <Browse />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation((url) => {
    if (url === "/guides/cities") return Promise.resolve({ data: [] });
    if (url === "/services") return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
  getTripDraft.mockReturnValue(DRAFT);
});

describe("Browse trip banner — role visibility", () => {
  test("hides the banner for a Local account, even with a draft in sessionStorage", async () => {
    useAuth.mockReturnValue({ user: { role: "local" } });
    renderBrowse();

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByTestId("trip-context-banner")).not.toBeInTheDocument();
  });

  test("hides the banner for an Admin account, even with a draft in sessionStorage", async () => {
    useAuth.mockReturnValue({ user: { role: "admin" } });
    renderBrowse();

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByTestId("trip-context-banner")).not.toBeInTheDocument();
  });

  test("shows the banner for a Traveller account", async () => {
    useAuth.mockReturnValue({ user: { role: "traveller" } });
    renderBrowse();

    expect(await screen.findByTestId("trip-context-banner")).toBeInTheDocument();
    expect(screen.getByText("Raipur")).toBeInTheDocument();
  });

  test("shows the banner for an anonymous (logged-out) visitor", async () => {
    useAuth.mockReturnValue({ user: null });
    renderBrowse();

    expect(await screen.findByTestId("trip-context-banner")).toBeInTheDocument();
  });

  test("hides the banner when there's no draft at all, regardless of role", async () => {
    getTripDraft.mockReturnValue(null);
    useAuth.mockReturnValue({ user: { role: "traveller" } });
    renderBrowse();

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByTestId("trip-context-banner")).not.toBeInTheDocument();
  });
});

describe("Browse trip banner — clear draft flow", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: { role: "traveller" } });
  });

  test("clicking Clear opens a confirmation dialog without clearing yet", async () => {
    const user = userEvent.setup();
    renderBrowse();
    await screen.findByTestId("trip-context-banner");

    await user.click(screen.getByTestId("clear-trip-link"));

    expect(await screen.findByText(/clear your trip\?/i)).toBeInTheDocument();
    expect(clearTripDraft).not.toHaveBeenCalled();
  });

  test("Cancel leaves the draft and banner untouched", async () => {
    const user = userEvent.setup();
    renderBrowse();
    await screen.findByTestId("trip-context-banner");

    await user.click(screen.getByTestId("clear-trip-link"));
    await user.click(await screen.findByText(/cancel/i));

    expect(clearTripDraft).not.toHaveBeenCalled();
    expect(screen.getByTestId("trip-context-banner")).toBeInTheDocument();
  });

  test("confirming Clear wipes the draft and removes the banner", async () => {
    const user = userEvent.setup();
    renderBrowse();
    await screen.findByTestId("trip-context-banner");

    await user.click(screen.getByTestId("clear-trip-link"));
    await user.click(await screen.findByTestId("confirm-clear-trip"));

    expect(clearTripDraft).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByTestId("trip-context-banner")).not.toBeInTheDocument()
    );
  });
});
