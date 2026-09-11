export interface ClosureTicket {
  price: string | number;
  profileId: string;
  profileName: string;
}

export interface ClosureTotals {
  totalRevenue: number;
  ticketsSoldCount: number;
  breakdown: Array<{
    profileId: string;
    profileName: string;
    count: number;
    revenue: number;
  }>;
}

export function calculateClosureTotals(tickets: ClosureTicket[]): ClosureTotals {
  const breakdownMap = new Map<string, ClosureTotals['breakdown'][number]>();

  for (const ticket of tickets) {
    const revenue = Number(ticket.price);
    if (!Number.isFinite(revenue) || revenue < 0) {
      throw new Error('Prix de ticket invalide');
    }

    const current = breakdownMap.get(ticket.profileId) ?? {
      profileId: ticket.profileId,
      profileName: ticket.profileName,
      count: 0,
      revenue: 0,
    };
    current.count += 1;
    current.revenue += revenue;
    breakdownMap.set(ticket.profileId, current);
  }

  return {
    totalRevenue: tickets.reduce((total, ticket) => total + Number(ticket.price), 0),
    ticketsSoldCount: tickets.length,
    breakdown: Array.from(breakdownMap.values()),
  };
}