// Brush Drips Wallet Types
export interface BrushDripWallet {
  id: number;
  user: number;
  username: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  profile_picture: string;
  email: string;
  balance: number;
  updated_at: string;
}

// Brush Drips Transaction Types
export interface BrushDripTransaction {
  drip_id: string;
  amount: number;
  transaction_object_type: string;
  transaction_object_id: string;
  transacted_at: string;
  transacted_by: number;
  transacted_by_username: string;
  transacted_by_profile_picture: string;
  transacted_to: number;
  transacted_to_username: string;
  transacted_to_profile_picture: string;
}

export interface BrushDripTransactionDetail {
  drip_id: string;
  amount: number;
  transaction_object_type: string;
  transaction_object_id: string;
  transacted_at: string;
  transacted_by: number;
  transacted_by_user: {
    id: number;
    email: string;
    username: string;
    brushdrips_count: number;
    fullname: string;
    profile_picture: string;
    is_superuser: boolean;
    artist_types: string[];
    collective_memberships: string[];
  };
  transacted_to: number;
  transacted_to_user: {
    id: number;
    email: string;
    username: string;
    brushdrips_count: number;
    fullname: string;
    profile_picture: string;
    is_superuser: boolean;
    artist_types: string[];
    collective_memberships: string[];
  };
}

export interface BrushDripTransactionStats {
  total_sent: number;
  total_received: number;
  net_balance: number;
  transaction_count_sent: number;
  transaction_count_received: number;
  total_transaction_count: number;
}

export interface BrushDripTransactionCreate {
  amount: number;
  transaction_object_type: string;
  transaction_object_id: string;
  transacted_by: number;
  transacted_to: number;
}

export interface TransactionsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BrushDripTransaction[];
}
