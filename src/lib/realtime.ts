export type QueueTicket = {
  queueNumber: number;
  displayName: string;
  calledAt: string | null;
  callCount: number;
};
export type QueueRoom = {
  roomId: number;
  roomName: string;
  current: QueueTicket | null;
  next: QueueTicket[];
};
export type QueueBoardData = { clinicName: string; generatedAt: string; rooms: QueueRoom[] };
export type DashboardOverview = {
  role: string;
  days: number;
  generatedAt: string;
  kpis: {
    key: string;
    label: string;
    value: number;
    previous: number | null;
    unit: string;
    changePercent: number | null;
  }[];
  visits: { date: string; completed: number; cancelled: number; noShow: number }[];
  revenue: { date: string; amount: number }[];
  services: { name: string; value: number }[];
  doctors: { name: string; value: number }[];
  statuses: { name: string; value: number }[];
};

export function callKey(room: QueueRoom) {
  return room.current?.calledAt
    ? `${room.roomId}:${room.current.queueNumber}:${room.current.calledAt}:${room.current.callCount}`
    : null;
}

/** First snapshot (including after a disconnect) is silent; subsequent calls/recalls announce once. */
export function newCalls(
  previous: Map<number, string | null>,
  rooms: QueueRoom[],
  initialized: boolean,
) {
  const calls = initialized
    ? rooms.filter((room) => callKey(room) && previous.get(room.roomId) !== callKey(room))
    : [];
  const keys = new Map(rooms.map((room) => [room.roomId, callKey(room)]));
  return { calls, keys };
}
