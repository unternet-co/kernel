import { Tool } from '@unternet/kernel';
import deepResearchTool from './deep-research';
import asyncTestTool from './async-test-tool';
import testTool from './test-tool';

export const tools = [testTool, asyncTestTool] as Tool[];

if (process.env.SERP_API_KEY) {
  tools.push(deepResearchTool);
}
