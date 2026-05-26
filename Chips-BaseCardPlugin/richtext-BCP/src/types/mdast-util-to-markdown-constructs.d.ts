import "mdast-util-to-markdown";

declare module "mdast-util-to-markdown" {
  interface ConstructNameMap {
    insert: "insert";
    mark: "mark";
    subscript: "subscript";
    superscript: "superscript";
  }
}
