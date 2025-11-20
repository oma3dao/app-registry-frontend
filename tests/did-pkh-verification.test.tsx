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

    it("shows verification options when wallet is connected", () => {
      // Test with connected wallet
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      expect(screen.getByRole("button", { name: /Discover Controlling Wallet/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
    });
  });

  describe("Initial Status Display", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);
    });

    it("shows idle status when not verified", () => {
      // Test initial idle state
      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      expect(
        screen.getByText(/Contract Ownership Verification Required/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Option 1 \(Recommended\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Option 2/i)).toBeInTheDocument();
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

  describe("Discover Controlling Wallet Flow", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);
    });

    it("discovers controlling wallet successfully", async () => {
      // Test successful discovery of controlling wallet
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          controllingWallet: "0xControllingWallet",
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

      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/discover-controlling-wallet",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ did: mockDid }),
          }
        );
      });

      // Should show transfer instructions after discovery
      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });
    });

    it("handles discovery failure with error message", async () => {
      // Test when discovery fails
      const user = userEvent.setup();
      const errorMessage = "Could not find contract owner";
      const mockFetch = vi.fn().mockResolvedValue({
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

      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it("handles discovery failure without error message", async () => {
      // Test when discovery fails without specific error
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
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

      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(
          screen.getByText(
            /Could not discover controlling wallet. The contract may not have standard ownership functions./i
          )
        ).toBeInTheDocument();
      });
    });

    it("handles network error during discovery", async () => {
      // Test network error handling
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("handles non-Error exceptions during discovery", async () => {
      // Test non-Error exception handling
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockRejectedValue("String error");
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(
          screen.getByText(/Failed to discover controlling wallet/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Automated Verification Flow", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);
    });

    it("verifies wallet ownership successfully", async () => {
      // Test successful automated verification
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
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

      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/verify-and-attest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            did: mockDid,
            connectedAddress: "0xConnectedWallet",
            requiredSchemas: ["oma3.ownership.v1"],
          }),
        });
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

    it("verifies wallet ownership successfully without debug info", async () => {
      // Test successful verification without debug method info
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
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

    it("handles automated verification failure with error message", async () => {
      // Test verification failure with specific error
      const user = userEvent.setup();
      const errorMessage = "Your wallet is not the contract owner";
      const mockFetch = vi.fn().mockResolvedValue({
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

      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles automated verification failure without error message", async () => {
      // Test verification failure without specific error
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
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

    it("handles network error during automated verification", async () => {
      // Test network error handling
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network timeout"));
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("Network timeout")).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles non-Error exceptions during automated verification", async () => {
      // Test non-Error exception handling
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockRejectedValue("Unknown error");
      global.fetch = mockFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

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

      const user = userEvent.setup();

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

  describe("Transfer Verification Flow", () => {
    beforeEach(() => {
      mockUseActiveAccount.mockReturnValue({
        address: "0xConnectedWallet",
      } as any);
    });

    it("verifies transfer successfully", async () => {
      // Test successful transfer verification
      const user = userEvent.setup();
      const discoverFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          controllingWallet: "0xControllingWallet",
        }),
      });
      const verifyFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          status: "ready",
        }),
      });

      global.fetch = discoverFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // First discover the controlling wallet
      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      // Now submit the transfer
      global.fetch = verifyFetch;
      const submitButton = screen.getByText("Submit Transfer");
      await user.click(submitButton);

      await waitFor(() => {
        expect(verifyFetch).toHaveBeenCalledWith("/api/verify-and-attest", {
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
      // Test transfer verification failure
      const user = userEvent.setup();
      const discoverFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          controllingWallet: "0xControllingWallet",
        }),
      });
      const errorMessage = "Invalid transaction hash";
      const verifyFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: errorMessage,
        }),
      });

      global.fetch = discoverFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // First discover the controlling wallet
      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      // Now submit the transfer
      global.fetch = verifyFetch;
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
          controllingWallet: "0xControllingWallet",
        }),
      });
      const verifyFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
        }),
      });

      global.fetch = discoverFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // First discover the controlling wallet
      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      // Now submit the transfer
      global.fetch = verifyFetch;
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
      // Test network error handling during transfer verification
      const user = userEvent.setup();
      const discoverFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          controllingWallet: "0xControllingWallet",
        }),
      });
      const verifyFetch = vi.fn().mockRejectedValue(new Error("Connection failed"));

      global.fetch = discoverFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // First discover the controlling wallet
      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      // Now submit the transfer
      global.fetch = verifyFetch;
      const submitButton = screen.getByText("Submit Transfer");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("Connection failed")).toBeInTheDocument();
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(false);
      });
    });

    it("handles non-Error exceptions during transfer verification", async () => {
      // Test non-Error exception handling during transfer verification
      const user = userEvent.setup();
      const discoverFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          controllingWallet: "0xControllingWallet",
        }),
      });
      const verifyFetch = vi.fn().mockRejectedValue("Unknown failure");

      global.fetch = discoverFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // First discover the controlling wallet
      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByTestId("transfer-instructions")).toBeInTheDocument();
      });

      // Now submit the transfer
      global.fetch = verifyFetch;
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

    it("allows retry after failed automated verification", async () => {
      // Test that user can retry after failure
      const user = userEvent.setup();
      const failFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: "First attempt failed",
        }),
      });
      const successFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          status: "ready",
        }),
      });

      global.fetch = failFetch;

      render(
        <DidPkhVerification
          did={mockDid}
          onVerificationComplete={mockOnVerificationComplete}
          isVerified={false}
        />
      );

      // First attempt fails
      const verifyButton = screen.getByRole("button", { name: /Verify Wallet Ownership/i });
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
        expect(screen.getByText("First attempt failed")).toBeInTheDocument();
      });

      // Button should still be available for retry
      expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();

      // Second attempt succeeds
      global.fetch = successFetch;
      await user.click(screen.getByRole("button", { name: /Verify Wallet Ownership/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/✅ Contract Ownership Verified/i)
        ).toBeInTheDocument();
      });
    });

    it("shows both buttons after failed discovery", async () => {
      // Test that both options remain available after discovery fails
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: "Discovery failed",
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

      const discoverButton = screen.getByRole("button", { name: /Discover Controlling Wallet/i });
      await user.click(discoverButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ Verification Failed/i)).toBeInTheDocument();
      });

      // Both options should still be available
      expect(screen.getByRole("button", { name: /Discover Controlling Wallet/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Verify Wallet Ownership/i })).toBeInTheDocument();
    });
  });
});

