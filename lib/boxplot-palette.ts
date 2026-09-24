export type BoxplotPalette = {
  fill: string;
  stroke: string;
};

const SHAM = { fill: "#D4D9DE", stroke: "#5F6B76" } as const;
const OVX = { fill: "#E2C5C3", stroke: "#9A625E" } as const;
const POSITIVE = { fill: "#C3D1E0", stroke: "#5E7792" } as const;
const UNFERMENTED = { fill: "#DED0B4", stroke: "#8D7446" } as const;
const INACTIVATED = { fill: "#BFD5D1", stroke: "#547E77" } as const;
const ACTIVE = { fill: "#D0C7DB", stroke: "#75678A" } as const;
const BACTERIA = { fill: "#D2D6BA", stroke: "#70784E" } as const;

// 固定按实验组身份映射。空组不会导致后续组重新分配颜色。
export const BOXPLOT_GROUP_PALETTE: readonly BoxplotPalette[] = [
  SHAM,
  OVX,
  POSITIVE,
  UNFERMENTED,
  INACTIVATED,
  INACTIVATED,
  ACTIVE,
  ACTIVE,
  BACTERIA,
  BACTERIA,
];

export const BOXPLOT_TREATMENT_LEGEND = [
  { label: "Sham", palette: SHAM },
  { label: "OVX", palette: OVX },
  { label: "阳性", palette: POSITIVE },
  { label: "未发酵", palette: UNFERMENTED },
  { label: "灭活", palette: INACTIVATED },
  { label: "未灭活", palette: ACTIVE },
  { label: "单菌液", palette: BACTERIA },
] as const;
