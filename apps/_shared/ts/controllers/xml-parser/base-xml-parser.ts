import { SAXParser } from 'sax-ts';

import { TreeNode } from './models/tree-node';

export class BaseXMLParser {
  protected rootNode: TreeNode;
  protected currentNode: TreeNode;
  protected stack: TreeNode[];

  constructor() {
    this.rootNode = new TreeNode("root", null, {}, [], null);
    this.currentNode = this.rootNode;
    this.stack = [];
  }

  private resetNodes() {
    this.rootNode = new TreeNode("root", null, {}, [], null);
    this.currentNode = this.rootNode;
    this.stack = [];
  }

  public parseXML(responseXMLText: string) {
    this.resetNodes();
    
    const parser = new SAXParser(true, {
      xmlns: false,
    });

    parser.onerror = (saxError: any) => {
      console.error(saxError);
      debugger;

      this.onError(saxError);
    };
    parser.onopentag = (node: Record<string, any>) => {
      const nodeName = node['name'] as string;
      const nodeAttributes = node['attributes'] as Record<string, string>;
      this.onOpenTag(nodeName, nodeAttributes);
    };
    parser.ontext = (text: string) => {
      this.onText(text);
    };
    parser.onclosetag = (nodeName: string) => {
      this.onSaxCloseTag(nodeName);
    };
    // TODO: this handler doesnt work as expcted, see the EOD handling in the onSaxCloseTag
    // parser.onend = () => {
    //   this.onEnd();
    // };

    parser.write(responseXMLText);
  }

  private onOpenTag(nodeName: string, attributes: Record<string, string>) {
    const newNode = new TreeNode(nodeName, this.currentNode, attributes, [], null);

    this.currentNode.children.push(newNode);
    this.stack.push(newNode);
    this.currentNode = newNode;
  }

  private onText(newText: string) {
    newText = newText.trim();
    if (this.currentNode.text === null) {
      this.currentNode.text = '';
    }

    this.currentNode.text += newText;
  }

  private onSaxCloseTag(saxNodeName: string) {
    // remove currentNode from stack
    this.stack.pop();

    // nodes with children should have null text
    if (this.currentNode.children.length > 0) {
      this.currentNode.text = null;
    }

    // dont rely on callback saxNodeName because it might contain the wrong prefix
    const nodeName = this.currentNode.name;
    this.onCloseTag(nodeName);
    
    if ((this.stack.length - 1) >= 0) {
      // currentNode becomes latest item from the stack
      this.currentNode = this.stack[this.stack.length - 1];
    } else {
      // otherwise we reached end of the document
      this.onEnd();
    }
  }

  protected onCloseTag(nodeName: string) {
    // override
  }

  protected onError(saxError: any) {
    // override
  }

  protected onEnd(): void {
    // override
  }
}
