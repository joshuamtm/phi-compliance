declare module 'react-gauge-chart' {
  import { CSSProperties } from 'react';

  interface GaugeChartProps {
    id: string;
    nrOfLevels?: number;
    arcsLength?: number[];
    colors?: string[];
    percent: number;
    arcPadding?: number;
    cornerRadius?: number;
    textColor?: string;
    needleColor?: string;
    needleBaseColor?: string;
    hideText?: boolean;
    animDelay?: number;
    formatTextValue?: (value: string) => string;
    style?: CSSProperties;
  }

  declare const GaugeChart: React.FC<GaugeChartProps>;
  export default GaugeChart;
}