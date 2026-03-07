export interface BasecardConfig {
  id: string;
  title: string;
  body: string;
  locale?: string;
}

export const defaultBasecardConfig: BasecardConfig = {
  id: "",
  title: "",
  body: "",
  locale: "zh-CN",
};

