export interface BasecardConfig {
  /**
   * 基础卡片实例 ID，由复合卡片结构与卡片服务负责生成与管理。
   */
  id: string;

  /**
   * 富文本内容，使用 HTML 字符串保存。
   */
  body: string;

  /**
   * 语言代码，例如 zh-CN / en-US。
   */
  locale?: string;
}

export const defaultBasecardConfig: BasecardConfig = {
  id: "",
  body: "",
  locale: "zh-CN",
};
