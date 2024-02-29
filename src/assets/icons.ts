import { LabIcon } from '@jupyterlab/ui-components';
import gpuIconStr from '../../style/icons/expansion-card.svg';
import hBarIconStr from '../../style/icons/horizontal-bar-chart.svg';
import vBarIconStr from '../../style/icons/vertical-bar-chart.svg';
import lineIconStr from '../../style/icons/line-chart.svg';
import pauseIconStr from '../../style/icons/pause.svg';
import playIconStr from '../../style/icons/play.svg';

export const gpuIcon = new LabIcon({
  name: 'launcher:gpu-icon',
  svgstr: gpuIconStr
});

export const hBarIcon = new LabIcon({
  name: 'launcher:hbar-icon',
  svgstr: hBarIconStr
});

export const vBarIcon = new LabIcon({
  name: 'launcher:vbar-icon',
  svgstr: vBarIconStr
});

export const lineIcon = new LabIcon({
  name: 'launcher:time-series-icon',
  svgstr: lineIconStr
});

export const pauseIcon = new LabIcon({
  name: 'launcher:pause-icon',
  svgstr: pauseIconStr
});

export const playIcon = new LabIcon({
  name: 'launcher:play-icon',
  svgstr: playIconStr
});
