import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { Theme } from '../../theme';

export interface TrendPoint {
  name: string;
  hints: number;
  wrong: number;
  time?: number | null;
}

/**
 * Solve-trend chart for the Progress page.
 *
 * Split into its own module and lazy-loaded because Recharts is ~530 KB — more
 * than the rest of the application put together — for this one multi-series
 * line chart. Loading it on demand keeps the Progress page chunk at ~23 KB and
 * means a solver with no history yet never downloads the library at all.
 *
 * If the weight ever becomes a problem on the pages that DO show it, the
 * honest next step is a hand-rolled SVG line chart: this uses two or three
 * series, linear axes and a tooltip, none of which need a charting library.
 */
export default function TrendChart({
  trendData,
  hasTimeData,
  gridColor,
  axisColor,
  T,
}: {
  trendData: TrendPoint[];
  hasTimeData: boolean;
  gridColor: string;
  axisColor: string;
  T: Theme;
}) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <LineChart
        data={trendData}
        margin={{ top: 4, right: hasTimeData ? 36 : 4, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: axisColor }} interval="preserveStartEnd" />
        <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 9, fill: axisColor }} />
        {hasTimeData && (
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#0EA5E9' }} />
        )}
        <Tooltip
          contentStyle={{
            background: T.cardBg,
            border: `1px solid ${T.cardBorder}`,
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: T.text, fontWeight: 700 }}
          formatter={(value: number, name: string) => {
            if (name === 'time') {
              return [
                value < 60 ? `${value}s` : `${Math.floor(value / 60)}m ${value % 60}s`,
                'Time',
              ];
            }
            if (name === 'hints') return [value, 'Hints'];
            if (name === 'wrong') return [value, 'Wrong guesses'];
            return [value, name];
          }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="hints"
          stroke="#7C3AED"
          strokeWidth={2}
          dot={{ r: 3, fill: '#7C3AED' }}
          activeDot={{ r: 5 }}
          name="hints"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="wrong"
          stroke="#EF4444"
          strokeWidth={2}
          dot={{ r: 3, fill: '#EF4444' }}
          activeDot={{ r: 5 }}
          name="wrong"
        />
        {hasTimeData && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="time"
            stroke="#0EA5E9"
            strokeWidth={2}
            dot={{ r: 3, fill: '#0EA5E9' }}
            activeDot={{ r: 5 }}
            name="time"
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
