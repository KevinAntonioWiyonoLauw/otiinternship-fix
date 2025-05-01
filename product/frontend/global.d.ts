import React from 'react';

declare module '@splinetool/react-spline' {
  import { Application } from '@splinetool/runtime';
  import React from 'react';

  interface SplineProps {
    scene: string;
    className?: string;
    onLoad?: (splineApp: Application) => void;
  }

  const Spline: React.FC<SplineProps>;
  export default Spline;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        url?: string; // Make url optional to match usage
        loading?: string;
        className?: string; // Add className
        // Add other potential attributes if needed
      }, HTMLElement>;
    }
  }
}

export {};