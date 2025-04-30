/// <reference types="react" />

declare namespace JSX {
  interface IntrinsicElements {
    'spline-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      url: string;  // Making url required since it's necessary for the component
    }, HTMLElement>;
  }
}

declare module '@splinetool/viewer'; 