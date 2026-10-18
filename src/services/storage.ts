import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ticket } from '../types';

const TICKETS_KEY = 'pv_tickets';

export async function getTickets(): Promise<Ticket[]> {
  try {
    const raw = await AsyncStorage.getItem(TICKETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveTicket(ticket: Ticket): Promise<void> {
  const tickets = await getTickets();
  const idx = tickets.findIndex((t) => t.id === ticket.id);
  if (idx >= 0) tickets[idx] = ticket;
  else tickets.unshift(ticket);
  await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

export async function updateTicket(
  id: string,
  patch: Partial<Ticket>,
): Promise<void> {
  const tickets = await getTickets();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx >= 0) {
    tickets[idx] = { ...tickets[idx], ...patch };
    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  }
}

export async function deleteTicket(id: string): Promise<void> {
  const tickets = await getTickets();
  await AsyncStorage.setItem(
    TICKETS_KEY,
    JSON.stringify(tickets.filter((t) => t.id !== id)),
  );
}

export function generateId(): string {
  return `pv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
