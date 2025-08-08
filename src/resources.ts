import { Tool, ToolCall } from './tools';
import { JSONValue } from './types';

export interface ResourceIcon extends Record<string, JSONValue> {
  src: string;
  purpose?: string;
  sizes?: string;
  type?: string;
}

export interface Resource {
  type: string;
  uri: string;
  name?: string;
  short_name?: string;
  icons?: ResourceIcon[];
  description?: string;
  tools?: Tool[];
}

// export class ToolCollection {
//   icons: ResourceIcon[] = [];
//   tools: Tool[] = [];

//   call(toolCall: ToolCall) {

//   }
// }
