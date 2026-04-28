import { preComplianceService } from "../preCompliance";
import { amlService } from "../../services/aml";

jest.mock("../../services/aml", () => ({
  amlService: {
    monitorTransaction: jest.fn(),
  },
}));

describe("PreComplianceService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows a transaction when AML monitoring does not flag it", async () => {
    (amlService.monitorTransaction as jest.Mock).mockResolvedValue({
      flagged: false,
      ruleHits: [],
    });

    const transaction = {
      id: "tx-123",
      amount: "100.00",
      userId: "user-123",
      type: "deposit",
      createdAt: new Date(),
      status: "pending",
      referenceNumber: "ref-123",
      phoneNumber: "+1234567890",
      provider: "mtn",
      stellarAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      tags: [],
      assetType: "native",
      metadata: {},
      locationMetadata: null,
      updatedAt: new Date(),
    } as any;

    const result = await preComplianceService.checkTransaction(transaction);

    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(amlService.monitorTransaction).toHaveBeenCalledWith({
      id: "tx-123",
      userId: "user-123",
      type: "deposit",
      amount: 100,
      createdAt: transaction.createdAt,
    });
  });

  it("blocks a transaction when AML monitoring flags it", async () => {
    (amlService.monitorTransaction as jest.Mock).mockResolvedValue({
      flagged: true,
      ruleHits: [
        {
          rule: "single_transaction_threshold",
          message: "Single transaction exceeds threshold",
          observed: 2000000,
          threshold: 1000000,
        },
      ],
      alert: {
        id: "alert-123",
        transactionId: "tx-123",
        userId: "user-123",
        severity: "high",
        status: "pending_review",
        ruleHits: [
          {
            rule: "single_transaction_threshold",
            message: "Single transaction exceeds threshold",
            observed: 2000000,
            threshold: 1000000,
          },
        ],
        reasons: ["Single transaction exceeds threshold"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    const transaction = {
      id: "tx-123",
      amount: "2000000",
      userId: "user-123",
      type: "withdraw",
      createdAt: new Date(),
      status: "pending",
      referenceNumber: "ref-123",
      phoneNumber: "+1234567890",
      provider: "mtn",
      stellarAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      tags: [],
      assetType: "native",
      metadata: {},
      locationMetadata: null,
      updatedAt: new Date(),
    } as any;

    const result = await preComplianceService.checkTransaction(transaction);

    expect(result.allowed).toBe(false);
    expect(result.reasons).toEqual(["Single transaction exceeds threshold"]);
    expect(result.severity).toBe("high");
    expect(result.alertId).toBe("alert-123");
  });
});
