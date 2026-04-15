/**
 * Tests for did-pkh-verification component
 * Tests contract ownership verification flows for did:pkh DIDs
 *
 * The component is effect-driven:
 *   1. On mount (with wallet connected), auto-discovers controlling wallet
 *   2. If discovered wallet === connected wallet, auto-verifies
 *   3. If different, shows transfer instructions
 *   4. "Verify Wallet Ownership" button only appears as retry after failure
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DidPkhVerification } from "@/components/did-pkh-verification";

vi.mock("thirdweb/react", () => ({
  useActiveAccount: vi.fn(),
}));

vi.mock("@/components/onchain-transfer-instructions", () => ({
  OnchainTransferInstructions: vi.fn(({ onTransferProvided }) => (
    <div data-testid="transfer-instructions">
      <button onClick={() => onTransferProvided("0xmocktxhash")}>
        Submit Transfer
      </button>
    </div>
  )),
}));

const mockUseActiveAccount = vi.mocked(
  await import("thirdweb/react")
).useActiveAccount;

/** Build a fetch mock that routes responses by URL path. */
function routedFetch(routes: Record<string, object>) {
  return vi.fn(async (url: string) => ({
    ok: true,
    json: async () => routes[url] ?? { ok: false, error: "unhandled" },
  }));
}

describe("DidPkhVerification", () => {
  const mockOnVerificationComplete = vi.fn();
  const mockDid = "did:pkh:eip155:1:0x1234567890123456789012345678901234567890";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  // ---------------------------------------------------------------------------
  // Wallet Connection
  // ---------------------------------------------------------------------------

  describe("Wallet Connection", () => {
    it("shows message when wallet is not connected", () => {
      mockUseActiveAccount.mockReturnValue(null);

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      expect(
        screen.getByText(/Please connect your wallet to verify contract ownership/i)
      ).toBeInTheDocument();
    });

    it("begins auto-discovery when wallet is connected", async () => {
      mockUseActiveAccount.mockReturnValue({ address: "0xConnectedWallet" } as any);

      const mockFetch = routedFetch({
        "/api/discover-controlling-wallet": {
          ok: true,
          controllingWallet: "0xOtherWallet",
        },
      });
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/discover-controlling-wallet",
          expect.objectContaining({ method: "POST" })
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Initial Status Display
  // ---------------------------------------------------------------------------

  describe("Initial Status Display", () => {
    it("shows discovering state on mount when not verified", async () => {
      mockUseActiveAccount.mockReturnValue({ address: "0xConnectedWallet" } as any);

      // Hang forever so we can observe the "discovering" UI
      global.fetch = vi.fn(() => new Promise(() => {}));

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Discovering Controlling Wallet/i)
        ).toBeInTheDocument();
      });
    });

    it("shows verified status when already verified", () => {
      mockUseActiveAccount.mockReturnValue({ address: "0xConnectedWallet" } as any);

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={true}
        />
      );

      expect(screen.getByText(/✅ Contract Ownership Verified/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Your wallet is confirmed as the contract owner\/admin/i)
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Discover Controlling Wallet Flow
  // ---------------------------------------------------------------------------

  describe("Discover Controlling Wallet Flow", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({ address: "0xConnectedWallet" } as any);
    });

    it("discovers controlling wallet and shows transfer instructions", async () => {
      const mockFetch = routedFetch({
        "/api/discover-controlling-wallet": {
          ok: true,
          controllingWallet: "0xDifferentWallet",
        },
      });
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/discover-controlling-wallet",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ did: mockDid }),
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/Ownership Verification Required/i)).toBeInTheDocument();
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });
    });

    it("handles discovery failure with error message", async () => {
      const errorMessage = "Could not find contract owner";
      const mockFetch = routedFetch({
        "/api/discover-controlling-wallet": {
          ok: false,
          error: errorMessage,
        },
      });
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it("handles discovery failure without error message", async () => {
      const mockFetch = routedFetch({
        "/api/discover-controlling-wallet": { ok: false },
      });
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(
          screen.getByText(
            /Could not discover controlling wallet\. The contract may not have standard ownership functions\./i
          )
        ).toBeInTheDocument();
      });
    });

    it("handles network error during discovery", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("handles non-Error exceptions during discovery", async () => {
      global.fetch = vi.fn().mockRejectedValue("String error");

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(
          screen.getByText(/Failed to discover controlling wallet/i)
        ).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Automated Verification Flow (wallet match → auto-verify)
  // ---------------------------------------------------------------------------

  describe("Automated Verification Flow", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({ address: "0xConnectedWallet" } as any);
    });

    it("auto-verifies when discovered wallet matches connected wallet", async () => {
      const mockFetch = vi.fn(async (url: string) => ({
        ok: true,
        json: async () => {
          if (url === "/api/discover-controlling-wallet") {
            return { ok: true, controllingWallet: "0xconnectedwallet" };
          }
          return {
            ok: true,
            status: "ready",
            debug: { verificationMethod: "contract ownership via owner()" },
          };
        },
      }));
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/verify-and-attest",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              did: mockDid,
              connectedAddress: "0xConnectedWallet",
              requiredSchemas: ["oma3.ownership.v1"],
            }),
          })
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText(/✅ Contract Ownership Verified/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Verified via: contract ownership via owner\(\)/i)
        ).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(true);
      });
    });

    it("auto-verifies with default method name when debug info is absent", async () => {
      const mockFetch = vi.fn(async (url: string) => ({
        ok: true,
        json: async () => {
          if (url === "/api/discover-controlling-wallet") {
            return { ok: true, controllingWallet: "0xconnectedwallet" };
          }
          return { ok: true, status: "ready" };
        },
      }));
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/✅ Contract Ownership Verified/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Verified via: contract ownership/i)
        ).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(true);
      });
    });

    it("handles automated verification failure with error message", async () => {
      const errorMessage = "Your wallet is not the contract owner";
      const mockFetch = vi.fn(async (url: string) => ({
        ok: true,
        json: async () => {
          if (url === "/api/discover-controlling-wallet") {
            return { ok: true, controllingWallet: "0xconnectedwallet" };
          }
          return { ok: false, error: errorMessage };
        },
      }));
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles automated verification failure without error message", async () => {
      const mockFetch = vi.fn(async (url: string) => ({
        ok: true,
        json: async () => {
          if (url === "/api/discover-controlling-wallet") {
            return { ok: true, controllingWallet: "0xconnectedwallet" };
          }
          return { ok: false };
        },
      }));
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(
          screen.getByText(
            /Verification failed\. Your wallet must be the contract owner\/admin\./i
          )
        ).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles network error during automated verification", async () => {
      let callCount = 0;
      global.fetch = vi.fn(async (url: string) => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({ ok: true, controllingWallet: "0xconnectedwallet" }),
          };
        }
        throw new Error("Network timeout");
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("Network timeout")).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles non-Error exceptions during automated verification", async () => {
      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({ ok: true, controllingWallet: "0xconnectedwallet" }),
          };
        }
        throw "Unknown error";
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(
          screen.getByText(/Failed to verify contract ownership/i)
        ).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("does not show verification controls when wallet is not connected", () => {
      mockUseActiveAccount.mockReturnValue(null);

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      expect(
        screen.queryByRole("button", { name: /Verify Wallet Ownership/i })
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Transfer Verification Flow
  // ---------------------------------------------------------------------------

  describe("Transfer Verification Flow", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({ address: "0xConnectedWallet" } as any);
    });

    it("verifies transfer successfully", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.fn(async (url: string) => ({
        ok: true,
        json: async () => {
          if (url === "/api/discover-controlling-wallet") {
            return { ok: true, controllingWallet: "0xDifferentWallet" };
          }
          return { ok: true, status: "ready" };
        },
      }));
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      const submitButton = screen.getByText("Submit Transfer");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/verify-and-attest",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              did: mockDid,
              connectedAddress: "0xConnectedWallet",
              requiredSchemas: ["oma3.ownership.v1"],
              txHash: "0xmocktxhash",
            }),
          })
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText(/✅ Contract Ownership Verified/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Verified via: onchain transfer/i)
        ).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(true);
      });
    });

    it("handles transfer verification failure with error message", async () => {
      const user = userEvent.setup();
      const errorMessage = "Invalid transaction hash";

      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({ ok: true, controllingWallet: "0xDifferentWallet" }),
          };
        }
        return {
          ok: true,
          json: async () => ({ ok: false, error: errorMessage }),
        };
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Submit Transfer"));

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles transfer verification failure without error message", async () => {
      const user = userEvent.setup();

      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({ ok: true, controllingWallet: "0xDifferentWallet" }),
          };
        }
        return {
          ok: true,
          json: async () => ({ ok: false }),
        };
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Submit Transfer"));

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(
          screen.getByText(
            /Transfer verification failed\. Please check the transaction hash and try again\./i
          )
        ).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles network error during transfer verification", async () => {
      const user = userEvent.setup();

      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({ ok: true, controllingWallet: "0xDifferentWallet" }),
          };
        }
        throw new Error("Connection failed");
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Submit Transfer"));

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("Connection failed")).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles non-Error exceptions during transfer verification", async () => {
      const user = userEvent.setup();

      let callCount = 0;
      global.fetch = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({ ok: true, controllingWallet: "0xDifferentWallet" }),
          };
        }
        throw "Unknown failure";
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Submit Transfer"));

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to verify transfer/i)).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error Recovery
  // ---------------------------------------------------------------------------

  describe("Error Recovery", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({ address: "0xConnectedWallet" } as any);
    });

    it("allows retry via Verify Wallet Ownership button after failed auto-verify", async () => {
      const user = userEvent.setup();

      let callCount = 0;
      global.fetch = vi.fn(async (url: string) => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({ ok: true, controllingWallet: "0xconnectedwallet" }),
          };
        }
        if (callCount === 2) {
          return {
            ok: true,
            json: async () => ({ ok: false, error: "First attempt failed" }),
          };
        }
        return {
          ok: true,
          json: async () => ({ ok: true, status: "ready" }),
        };
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("First attempt failed")).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);

      await waitFor(() => {
        expect(
          screen.getByText(/✅ Contract Ownership Verified/i)
        ).toBeInTheDocument();
      });
    });

    it("shows retry button after failed discovery", async () => {
      const mockFetch = routedFetch({
        "/api/discover-controlling-wallet": {
          ok: false,
          error: "Discovery failed",
        },
      });
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: /Verify Wallet Ownership/i })
      ).toBeInTheDocument();
    });
  });
});
