export interface TransactionV3 {
  now: number;
  description: {
    aborted: boolean;
  };
  in_msg?: {
    hash: string;
    source: string;
    destination: string;
    value: string;
  };
  out_msgs?: {
    hash: string;
    source: string;
    destination: string;
    value: string;
  }[];
}
