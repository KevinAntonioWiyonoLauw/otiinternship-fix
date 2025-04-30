declare module '@splinetool/react-spline' {
  import { Application } from '@splinetool/runtime';

  interface SplineProps {
    scene: string;
    className?: string;
    onLoad?: (splineApp: Application) => void;
  }

  const Spline: React.FC<SplineProps>;
  export default Spline;
}

declare namespace JSX {
  interface IntrinsicElements {
    'spline-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        url?: string;
      },
      HTMLElement
    >;
  }
} 