export interface BasecardConfig {
  /**
   * 基础卡片实例 ID，由上层复合卡片结构负责生成与管理。
   */
  id: string;

  /**
   * 标题文本。
   */
  title: string;

  /**
   * 主体内容文本。
   */
  body: string;

  /**
   * 语言代码，例如 zh-CN / en-US。
   */
  locale?: string;
}

export const defaultBasecardConfig: BasecardConfig = {
  id: "",
  title: "",
  body: "",
  locale: "zh-CN",
};

