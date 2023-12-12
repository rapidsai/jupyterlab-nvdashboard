import React from 'react';

interface ITooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  color?: string | undefined;
}

interface ITooltipOptions {
  labelFormatter?: (value: string | undefined) => string;
  valueFormatter?: (value: number) => string;
}

export function renderCustomTooltip(
  data: ITooltipProps,
  options: ITooltipOptions
): JSX.Element | null {
  if (data.active && data.payload && data.payload.length) {
    const { payload, label } = data;
    const formatterLabel = options.labelFormatter
      ? options.labelFormatter(label)
      : label;

    const formattedYValues = payload.map(
      (entry: any) =>
        `${entry.name}: ${
          options.valueFormatter
            ? options.valueFormatter(entry.value)
            : entry.value
        }`
    );

    const color = payload.map((entry: any) => entry.color);
    const columnCount = Math.ceil(formattedYValues.length / 5);
    return (
      <div className="custom-tooltip">
        <div className="tooltip-title">{formatterLabel}</div>
        <div style={{ columnCount: columnCount }}>
          {formattedYValues.map((value: string, index: number) => (
            <div
              key={index}
              className="tooltip-value"
              style={color[index] ? { color: `${color[index]}` } : {}}
            >
              {value}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
