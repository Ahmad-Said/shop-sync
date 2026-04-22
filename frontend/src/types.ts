export interface User {
  id: string;
  username: string;
  email: string;
  avatar_color: string;
}

export type ItemStatus = 'unassigned' | 'claimed' | 'found' | 'in_cart';

export interface Item {
  id: string;
  event_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string | null;
  notes: string | null;
  assigned_to: string | null;
  assigned_username: string | null;
  assigned_color: string | null;
  status: ItemStatus;
  added_by: string;
  created_at: string;
}

export interface Member {
  id: string;
  username: string;
  avatar_color: string;
}

export interface Event {
  id: string;
  name: string;
  store_name: string | null;
  invite_code: string;
  creator_id: string;
  is_active: boolean;
  created_at: string;
  member_count: number;
  item_count: number;
  items_done: number;
}

export interface EventDetail extends Event {
  members: Member[];
  items: Item[];
}
