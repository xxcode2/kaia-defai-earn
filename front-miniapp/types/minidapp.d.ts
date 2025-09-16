declare global {
  interface Window {
    MiniDapp?: {
      init: (opts: { clientId: string }) => any;
      openPayment?: (args: any) => Promise<void>;
      openPaymentHistory?: () => Promise<void>;
    };
  }
}
export {};
