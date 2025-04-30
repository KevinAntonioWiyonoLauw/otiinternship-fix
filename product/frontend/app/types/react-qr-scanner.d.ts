declare module 'react-qr-scanner' {
  import { Component } from 'react';

  interface QrScannerProps {
    onScan: (result: { text: string } | null) => void;
    onError: (error: Error) => void;
    style?: React.CSSProperties;
    className?: string;
    delay?: number;
    constraints?: {
      video?: {
        facingMode?: "user" | "environment" | { exact: "user" | "environment" };
        width?: { min?: number; ideal?: number; max?: number };
        height?: { min?: number; ideal?: number; max?: number };
      };
    };
  }

  export default class QrScanner extends Component<QrScannerProps> {}
} 