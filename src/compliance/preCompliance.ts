import { amlService } from "../services/aml";
import { Transaction } from "../models/transaction";

export interface PreComplianceResult {
  allowed: boolean;
  reasons: string[];
  severity?: "medium" | "high";
  alertId?: string;
}

export class PreComplianceService {
  async checkTransaction(transaction: Transaction): Promise<PreComplianceResult> {
    if (!transaction.userId) {
      return { allowed: true, reasons: [] };
    }

    const result = await amlService.monitorTransaction({
      id: transaction.id,
      userId: transaction.userId,
      type: transaction.type,
      amount: Number(transaction.amount),
      createdAt: transaction.createdAt,
    });

    if (!result.flagged) {
      return { allowed: true, reasons: [] };
    }

    return {
      allowed: false,
      reasons: result.ruleHits.map((hit) => hit.message),
      severity: result.alert?.severity,
      alertId: result.alert?.id,
    };
  }
}

export const preComplianceService = new PreComplianceService();
