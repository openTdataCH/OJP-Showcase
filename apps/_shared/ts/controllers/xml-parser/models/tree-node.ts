export class TreeNode {
  public name: string;
  public parent: TreeNode | null;
  public attributes: { [key: string]: string };
  public children: TreeNode[];
  public text: string | null;

  constructor(
    name: string,
    parent: TreeNode | null,
    attributes: { [key: string]: string },
    children: TreeNode[],
    text: string | null
  ) {
    this.name = name;
    this.parent = parent;
    this.attributes = attributes;
    this.children = children;
    this.text = text;
  }

  public findTextFromChildNamed(expr: string): string | null {
    const exprParts = expr.split("/");

    let contextNode: TreeNode | null = this;
    exprParts.forEach((nodeName, idx) => {
      if (contextNode) {
        const newContextNode = contextNode.findChildNamed(nodeName);
        contextNode = newContextNode;
      }
    });

    const contextNodeText = contextNode?.text ?? null;
    return contextNodeText;
  }

  private findChildNamed(expr: string): TreeNode | null {
    const exprParts = expr.split("/");

    let contextNode: TreeNode | null = this;
    exprParts.forEach((nodeName, idx) => {
      const newContextNode =
        contextNode?.children.find((el) => {
          return el.name === nodeName;
        }) ?? null;

      contextNode = newContextNode;
    });

    return contextNode;
  }

  public findChildrenNamed(name: string): TreeNode[] {
    if (name.includes('/')) {
      const nameParts = name.split('/');
      const parentName = nameParts.slice(0, -1).join('/');
      
      const child = this.findChildNamed(parentName);
      if (child === null) {
        return [];
      }

      const lastName = nameParts.slice(-1)[0];
      
      return child.findChildrenNamed(lastName);
    }

    const foundTreeNodes: TreeNode[] = [];

    this.children.forEach((el) => {
      if (el.name === name) {
        foundTreeNodes.push(el);
      }
    });

    return foundTreeNodes;
  }

  public computeText(): string | null {
    const textParts: string[] = [];
    if (this.text === null) {
      if (this.children.length === 0) {
        return null;
      }
      this.children.forEach((child) => {
        const childText = child.computeText();
        if (childText) {
          textParts.push(childText);
        }
      });
    } else {
      textParts.push(this.text);
    }

    return textParts.join(' ');
  }
}
