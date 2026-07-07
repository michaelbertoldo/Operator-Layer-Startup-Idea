import { prisma } from "@/lib/prisma";
import { verifyAuditChain } from "@/lib/auditIntegrity";

export async function getAgents() {
  return prisma.agent.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      policy: true
    }
  });
}

export async function getVendors() {
  return prisma.vendor.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }]
  });
}

export async function getPolicies() {
  return prisma.policy.findMany({
    orderBy: { name: "asc" }
  });
}

export async function getPaymentRequests() {
  return prisma.paymentRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      agent: true,
      vendor: true,
      reservation: {
        include: {
          budgetPeriod: true
        }
      }
    }
  });
}

export async function getApprovalRequests() {
  return prisma.paymentRequest.findMany({
    where: { status: "Needs approval" },
    orderBy: { createdAt: "desc" },
    include: {
      agent: true,
      vendor: true,
      reservation: {
        include: {
          budgetPeriod: true
        }
      }
    }
  });
}

export async function getAuditLogs() {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function getAuditIntegrity() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "asc" }
  });

  return {
    logs,
    integrity: verifyAuditChain(logs)
  };
}

export async function getCompanySettings() {
  return prisma.company.findFirst({
    include: {
      users: {
        orderBy: { name: "asc" }
      }
    }
  });
}

export async function getDashboardData() {
  const [company, agents, paymentRequests, auditLogs] = await Promise.all([
    prisma.company.findFirst(),
    getAgents(),
    getPaymentRequests(),
    getAuditLogs()
  ]);

  return {
    company,
    agents,
    paymentRequests,
    auditLogs,
    totals: {
      activeAgents: agents.filter((agent) => agent.status === "Active").length,
      weeklySpend: agents.reduce((sum, agent) => sum + agent.spentThisWeekCents, 0),
      pendingApprovals: paymentRequests.filter(
        (request) => request.status === "Needs approval"
      ).length,
      blockedRequests: paymentRequests.filter((request) => request.status === "Blocked")
        .length
    }
  };
}

export async function getDemoScenarios() {
  const requests = await getPaymentRequests();
  const scenarioByStatus = [
    { name: "Safe request", status: "Executed" },
    { name: "New vendor request", status: "Needs approval" },
    { name: "Dangerous request", status: "Blocked" }
  ];

  return scenarioByStatus
    .map((scenario) => {
      const request = requests.find((item) => item.status === scenario.status);

      if (!request) {
        return null;
      }

      return {
        ...scenario,
        request
      };
    })
    .filter((scenario): scenario is NonNullable<typeof scenario> => scenario !== null);
}
