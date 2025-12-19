/**
 * Tests for did-pkh-verification component
 * Tests contract ownership verification flows for did:pkh DIDs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DidPkhVerification } from "@/components/did-pkh-verification";

// Mock thirdweb hooks
vi.mock("thirdweb/react", () => ({
  useActiveAccount: vi.fn(),
}));

// Mock OnchainTransferInstructions component
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

describe("DidPkhVerification", () => {
  const mockOnVerificationComplete = vi.fn();
  const mockDid = "did:pkh:eip155:1:0x1234567890123456789012345678901234567890";

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock - tests will set up their own mocks as needed
    global.fetch = vi.fn();
  });

  describe("Wallet Connection", () => {
    it("shows message when wallet is not connected", () => {
      // Test when no wallet is connected
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

    it("shows discovering status when wallet is connected", async () => {
      // Test that component starts auto-discovery when wallet is connected
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);

      // Mock discovery that never completes (stays in discovering state)
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Component should show discovering status
      await waitFor(() => {
        expect(screen.getByText(/Discovering Controlling Wallet/i)).toBeInTheDocument();
      });
    });
  });

  describe("Initial Status Display", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);
    });

    it("shows failed status with retry button when auto-discovery fails", async () => {
      // Test that failed auto-discovery shows error and retry button
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Wait for discovery to fail
      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
    });

    it("shows verified status when already verified", () => {
      // Test when component starts as already verified
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

  describe("Auto-Discovery Flow", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);
    });

    it("auto-discovers controlling wallet and shows transfer instructions when wallets differ", async () => {
      // Test successful auto-discovery where controlling wallet is different
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          controllingWallet: "0xDifferentWallet",
        }),
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Should show transfer instructions after auto-discovery
      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      expect(screen.getByText(/Ownership Verification Required/i)).toBeInTheDocument();
    });

    it("auto-discovers and auto-verifies when wallets match", async () => {
      // Test successful auto-discovery where wallets match - should auto-verify
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            controllingWallet: "0xConnectedWallet", // Same as connected wallet
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            status: "ready",
          }),
        });
      
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Should auto-verify and show success
      await waitFor(() => {
        expect(screen.getByText(/✅ Contract Ownership Verified/i)).toBeInTheDocument();
      });

      expect(mockOnVerificationComplete).toHaveBeenCalledWith(true);
    });

    it("handles auto-discovery failure with error message", async () => {
      // Test auto-discovery failure with specific error
      const errorMessage = "Could not find contract owner";
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: errorMessage,
        }),
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
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it("handles auto-discovery failure without error message", async () => {
      // Test auto-discovery failure without specific error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false }),
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
          screen.getByText(
            /Could not discover controlling wallet. The contract may not have standard ownership functions./i
          )
        ).toBeInTheDocument();
      });
    });

    it("handles network error during auto-discovery", async () => {
      // Test network error during auto-discovery
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

    it("handles non-Error exceptions during auto-discovery", async () => {
      // Test non-Error exception during auto-discovery
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

  describe("Retry Verification After Failed Auto-Discovery", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);
    });

    it("retries verification successfully after auto-discovery fails", async () => {
      // Test clicking retry button after auto-discovery failure
      const user = userEvent.setup();
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error("Auto-discovery failed")) // Auto-discovery fails
        .mockResolvedValueOnce({ // Retry succeeds
          ok: true,
          json: async () => ({
            ok: true,
            status: "ready",
            debug: {
              verificationMethod: "contract ownership via owner()",
            },
          }),
        });
      
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Wait for auto-discovery to fail and retry button to appear
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
      });
      
      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

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

    it("retries verification successfully without debug info", async () => {
      // Test retry without debug method info
      const user = userEvent.setup();
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            status: "ready",
          }),
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
        expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
      });
      
      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

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

    it("handles retry verification failure with error message", async () => {
      // Test verification failure with specific error
      const user = userEvent.setup();
      const errorMessage = "Your wallet is not the contract owner";
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            ok: false,
            error: errorMessage,
          }),
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
        expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
      });
      
      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles retry verification failure without error message", async () => {
      // Test verification failure without specific error
      const user = userEvent.setup();
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            ok: false,
          }),
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
        expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
      });
      
      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(
          screen.getByText(
            /Verification failed. Your wallet must be the contract owner\/admin./i
          )
        ).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles network error during retry verification", async () => {
      // Test network error handling
      const user = userEvent.setup();
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error("Failed"))
        .mockRejectedValueOnce(new Error("Network timeout"));
      
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
      });
      
      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("Network timeout")).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles non-Error exceptions during retry verification", async () => {
      // Test non-Error exception handling
      const user = userEvent.setup();
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error("Failed"))
        .mockRejectedValueOnce("Unknown error");
      
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
      });
      
      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(
          screen.getByText(/Failed to verify contract ownership/i)
        ).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("prevents verification attempt when wallet is not connected", async () => {
      // Test that verification is prevented without wallet
      mockUseActiveAccount.mockReturnValue(null);

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Should not show verification buttons without wallet
      expect(
        screen.queryByText(/Verify Wallet Ownership/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Transfer Verification Flow (Auto-Discovered Wallet)", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);
    });

    it("verifies transfer successfully after auto-discovery finds different wallet", async () => {
      // Test successful transfer verification
      const user = userEvent.setup();
      
      // Auto-discovery finds a different controlling wallet
      global.fetch = vi.fn().mockImplementation((url: string | Request | URL) => {
        const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url;
        if (urlString.includes('/api/discover-controlling-wallet')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              controllingWallet: "0xDifferentWallet", // Different from connected wallet
            }),
          } as Response);
        } else if (urlString.includes('/api/verify-and-attest')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              status: "ready",
            }),
          } as Response);
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Auto-discovery should complete and show transfer instructions
      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      // Submit the transfer
      const submitButton = screen.getByText("Submit Transfer");
      await user.click(submitButton);

      // Verify the transfer succeeded
      await waitFor(() => {
        expect(
          screen.getByText(/✅ Contract Ownership Verified/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Verified via: onchain transfer/i)
        ).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(true);
      });

      // Verify the API was called correctly
      expect(global.fetch).toHaveBeenCalledWith("/api/verify-and-attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          did: mockDid,
          connectedAddress: "0xConnectedWallet",
          requiredSchemas: ["oma3.ownership.v1"],
          txHash: "0xmocktxhash",
        }),
      });
    });

    it("handles transfer verification failure with error message", async () => {
      // Test transfer verification failure with error
      const user = userEvent.setup();
      const errorMessage = "Invalid transaction hash";
      
      const discoverFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          controllingWallet: "0xDifferentWallet",
        }),
      });
      
      const verifyFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: errorMessage,
        }),
      });

      global.fetch = vi.fn().mockImplementation((url: string | Request | URL) => {
        const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url;
        if (urlString.includes('/api/discover-controlling-wallet')) {
          return discoverFetch(url);
        } else if (urlString.includes('/api/verify-and-attest')) {
          return verifyFetch(url);
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Wait for auto-discovery to complete and transfer instructions to appear
      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      // Submit the transfer
      const submitButton = screen.getByText("Submit Transfer");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles transfer verification failure without error message", async () => {
      // Test transfer verification failure without specific error
      const user = userEvent.setup();
      
      const discoverFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          controllingWallet: "0xDifferentWallet",
        }),
      });
      
      const verifyFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
        }),
      });

      global.fetch = vi.fn().mockImplementation((url: string | Request | URL) => {
        const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url;
        if (urlString.includes('/api/discover-controlling-wallet')) {
          return discoverFetch(url);
        } else if (urlString.includes('/api/verify-and-attest')) {
          return verifyFetch(url);
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Wait for auto-discovery and transfer instructions
      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      // Submit the transfer
      const submitButton = screen.getByText("Submit Transfer");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(
          screen.getByText(
            /Transfer verification failed. Please check the transaction hash and try again./i
          )
        ).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles network error during transfer verification", async () => {
      // Test network error during transfer verification
      const user = userEvent.setup();
      
      const discoverFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          controllingWallet: "0xDifferentWallet",
        }),
      });
      
      const verifyFetch = vi.fn().mockRejectedValue(new Error("Connection failed"));

      global.fetch = vi.fn().mockImplementation((url: string | Request | URL) => {
        const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url;
        if (urlString.includes('/api/discover-controlling-wallet')) {
          return discoverFetch(url);
        } else if (urlString.includes('/api/verify-and-attest')) {
          return verifyFetch(url);
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Wait for auto-discovery and transfer instructions
      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      // Submit the transfer
      const submitButton = screen.getByText("Submit Transfer");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("Connection failed")).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles non-Error exceptions during transfer verification", async () => {
      // Test non-Error exception during transfer verification
      const user = userEvent.setup();
      
      const discoverFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          controllingWallet: "0xDifferentWallet",
        }),
      });
      
      const verifyFetch = vi.fn().mockRejectedValue("Unknown failure");

      global.fetch = vi.fn().mockImplementation((url: string | Request | URL) => {
        const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url;
        if (urlString.includes('/api/discover-controlling-wallet')) {
          return discoverFetch(url);
        } else if (urlString.includes('/api/verify-and-attest')) {
          return verifyFetch(url);
        }
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      });

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Wait for auto-discovery and transfer instructions
      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      // Submit the transfer
      const submitButton = screen.getByText("Submit Transfer");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to verify transfer/i)).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("Error Recovery", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);
    });

    it("allows retry after failed verification", async () => {
      // Test that user can retry after failure
      const user = userEvent.setup();
      
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error("Auto-discovery failed")) // Auto-discovery fails
        .mockResolvedValueOnce({ // First retry fails
          ok: false,
          json: async () => ({
            ok: false,
            error: "First attempt failed",
          }),
        })
        .mockResolvedValueOnce({ // Second retry succeeds
          ok: true,
          json: async () => ({
            ok: true,
            status: "ready",
          }),
        });
      
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Wait for auto-discovery to fail and retry button to appear
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
      });
      
      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

      // First retry attempt fails
      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("First attempt failed")).toBeInTheDocument();
      });

      // Button should still be available for retry
      expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();

      // Second retry attempt succeeds
      await user.click(screen.getByRole("button", { name: /Verify Wallet Ownership/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/✅ Contract Ownership Verified/i)
        ).toBeInTheDocument();
      });
    });

    it("shows retry button after failed auto-discovery", async () => {
      // Test that retry button appears after auto-discovery fails
      global.fetch = vi.fn().mockRejectedValue(new Error("Discovery failed"));

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // Wait for auto-discovery to fail
      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
      });

      // Retry button should be available
      expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
    });
  });
});

