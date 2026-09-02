import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import RequesterBadge from "../../src/features/requester/RequesterBadge.js";

function Harness() {
  const { setRequester } = useRequester();
  return (
    <>
      <button
        onClick={() =>
          setRequester({ id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" })
        }
      >
        select
      </button>
      <RequesterBadge />
    </>
  );
}

describe("RequesterBadge", () => {
  it("shows the selected requester name and clears it on Change Requester", () => {
    render(
      <RequesterProvider>
        <Harness />
      </RequesterProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText("select"));
    });

    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /change requester/i }));

    expect(screen.queryByText("Jennifer Anderson")).not.toBeInTheDocument();
  });
});