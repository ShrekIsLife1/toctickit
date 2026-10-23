import { Request, Response } from "express";
import { getPrisma } from "./prisma.js";
import { TicketStatus, RequestedPriority } from "@prisma/client";

export const ACTIVE_STATUSES: TicketStatus[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
];

export function getRollingCutoffDate(days = 7, fromDate = new Date()): Date {
  return new Date(fromDate.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Handler for GET /api/dashboard/requester
 * Summarizes metrics and recent activity for the authenticated Requester (BR-27, BR-28, BR-29).
 */
export async function getRequesterDashboardHandler(req: Request, res: Response) {
  try {
    const currentUser = (req as Request & { currentUser: { id: number; role: string } }).currentUser;
    const prisma = getPrisma();
    const requesterId = currentUser.id;
    const sevenDaysAgo = getRollingCutoffDate(7);

    const [openTickets, waitingForRequester, recentlyResolved, closedTickets, recentlyUpdated] =
      await Promise.all([
        // Active tickets owned by this requester
        prisma.ticket.count({
          where: {
            requesterId,
            currentStatus: { in: ACTIVE_STATUSES },
          },
        }),
        // Waiting for requester
        prisma.ticket.count({
          where: {
            requesterId,
            currentStatus: "WAITING_FOR_REQUESTER",
          },
        }),
        // Resolved within past 7 rolling days
        prisma.ticket.count({
          where: {
            requesterId,
            currentStatus: "RESOLVED",
            statusChangedAt: { gte: sevenDaysAgo },
          },
        }),
        // Closed tickets count
        prisma.ticket.count({
          where: {
            requesterId,
            currentStatus: "CLOSED",
          },
        }),
        // Up to 5 most recently updated tickets owned by this requester
        prisma.ticket.findMany({
          where: { requesterId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            ticketNumber: true,
            summary: true,
            currentStatus: true,
            requestedPriority: true,
            updatedAt: true,
          },
        }),
      ]);

    res.status(200).json({
      openTickets,
      waitingForRequester,
      recentlyResolved,
      closedTickets,
      recentlyUpdated,
    });
  } catch (err) {
    console.error("Error loading requester dashboard:", err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to retrieve requester dashboard" },
    });
  }
}

/**
 * Handler for GET /api/dashboard/staff
 * Summarizes operational metrics for IT Staff and Administrators (AC-13, AC-14, BR-24).
 */
export async function getStaffDashboardHandler(req: Request, res: Response) {
  try {
    const currentUser = (req as Request & { currentUser: { id: number; role: string } }).currentUser;
    const prisma = getPrisma();
    const staffId = currentUser.id;

    // Aggregate queries on indexed columns (DD-4)
    const [
      unassigned,
      ownedByMe,
      statusGroups,
      priorityGroups,
      urgent,
      recentlyUpdated,
    ] = await Promise.all([
      // Unassigned active tickets
      prisma.ticket.count({
        where: {
          ticketOwnerId: null,
          currentStatus: { in: ACTIVE_STATUSES },
        },
      }),
      // Owned by authenticated staff member
      prisma.ticket.count({
        where: {
          ticketOwnerId: staffId,
          currentStatus: { in: ACTIVE_STATUSES },
        },
      }),
      // Active tickets grouped by status
      prisma.ticket.groupBy({
        by: ["currentStatus"],
        where: { currentStatus: { in: ACTIVE_STATUSES } },
        _count: { id: true },
      }),
      // Active tickets grouped by IT priority
      prisma.ticket.groupBy({
        by: ["itPriority"],
        where: {
          currentStatus: { in: ACTIVE_STATUSES },
          itPriority: { not: null },
        },
        _count: { id: true },
      }),
      // Top 5 urgent tickets (itPriority === HIGH, oldest updated first)
      prisma.ticket.findMany({
        where: {
          currentStatus: { in: ACTIVE_STATUSES },
          itPriority: "HIGH",
        },
        orderBy: { updatedAt: "asc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          itPriority: true,
          ticketOwnerId: true,
          updatedAt: true,
        },
      }),
      // 5 most recently updated tickets across the entire system
      prisma.ticket.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          itPriority: true,
          ticketOwnerId: true,
          updatedAt: true,
        },
      }),
    ]);

    // Build byStatus map with all 5 active statuses guaranteed
    const byStatus: Record<string, number> = {
      NEW: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_FOR_REQUESTER: 0,
      REOPENED: 0,
    };
    for (const group of statusGroups) {
      if (group.currentStatus in byStatus) {
        byStatus[group.currentStatus] = group._count.id;
      }
    }

    // Build byItPriority map with LOW, MEDIUM, HIGH guaranteed
    const byItPriority: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    };
    for (const group of priorityGroups) {
      if (group.itPriority && group.itPriority in byItPriority) {
        byItPriority[group.itPriority] = group._count.id;
      }
    }

    const responsePayload: any = {
      unassigned,
      ownedByMe,
      byStatus,
      byItPriority,
      urgent,
      recentlyUpdated,
    };

    // Administrator-only widget metrics (AC-14, BR-14)
    if (currentUser.role === "ADMINISTRATOR") {
      const [activeUsers, inactiveUsers, roleGroups] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.groupBy({
          by: ["role"],
          _count: { id: true },
        }),
      ]);

      const byRole: Record<string, number> = {
        REQUESTER: 0,
        IT_STAFF: 0,
        ADMINISTRATOR: 0,
      };
      for (const rg of roleGroups) {
        if (rg.role in byRole) {
          byRole[rg.role] = rg._count.id;
        }
      }

      responsePayload.userCounts = {
        active: activeUsers,
        inactive: inactiveUsers,
        byRole,
      };
    }

    res.status(200).json(responsePayload);
  } catch (err) {
    console.error("Error loading staff dashboard:", err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to retrieve staff dashboard" },
    });
  }
}
