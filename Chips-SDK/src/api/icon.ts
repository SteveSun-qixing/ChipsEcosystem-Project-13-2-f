export type IconStyle = "outlined" | "rounded" | "sharp";

export interface IconDescriptor {
  name: string;
  style?: IconStyle;
  fill?: 0 | 1;
  wght?: number;
  grad?: number;
  opsz?: number;
  decorative?: boolean;
  label?: string;
}
