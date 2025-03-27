import { type FunctionDeclaration } from "@google/generative-ai";

export type LiveIncomingMessage =
  | SetupCompleteMessage
  | ServerContentMessage
  | ToolCallMessage
  | ToolCallCancellationMessage;

export type ServerContent = ModelTurn | InterruptedContent | TurnCompleteContent;

export interface ServerContentMessage {
  serverContent: ServerContent;
}

export interface ToolCallMessage {
  toolCall: ToolCall;
}

export interface ToolCallCancellation {
  id: string;
}

export interface ToolCallCancellationMessage {
  toolCallCancellation: ToolCallCancellation;
}

export interface SetupCompleteMessage {
  setupComplete: {
    conversationId: string;
  };
}

export type LiveOutgoingMessage =
  | SetupMessage
  | ClientContentMessage
  | ToolResponseMessage;

export interface ClientContentMessage {
  clientContent: {
    turns: ClientContentTurn[];
  };
}

export interface ToolResponseMessage {
  toolResponse: {
    id: string;
    response: ToolResponse;
  };
}

export interface ToolResponse {
  functionResponse?: {
    name: string;
    response: {
      name: string;
      content: any;
    };
  };
}

export interface ToolCall {
  id: string;
  functionCalls: {
    name: string;
    args: Record<string, any>;
  }[];
}

export interface SetupMessage {
  setup: LiveConfig;
}

export interface LiveConfig {
  model: string;
  inline?: {
    includeImage?: boolean;
    includeAudio?: boolean;
  };
  systemInstruction?: {
    parts: Part[];
  };
  generationConfig?: GenerationConfig;
  tools?: LiveApiTools[];
}

export interface LiveApiTools {
  functionDeclarations?: FunctionDeclaration[];
  googleSearch?: {};
}

export interface GenerationConfig {
  stopSequences?: string[];
  candidateCount?: number;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface ModelTurn {
  modelTurn: {
    parts: Part[];
  };
}

export interface ClientContentTurn {
  userInput: {
    parts: Part[];
  };
}

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface InterruptedContent {
  interrupted: true;
}

export interface TurnCompleteContent {
  endOfTurn: true;
}

export interface StreamingLog {
  date: Date;
  type: string;
  message: object | string;
}

export interface RealtimeInputMessage {
  realtimeInput: {
    mimeType: string;
    data: string;
  }[];
}

export function isSetupCompleteMessage(
  message: any
): message is SetupCompleteMessage {
  return message && message.setupComplete !== undefined;
}

export function isServerContentMessage(
  message: any
): message is ServerContentMessage {
  return message && message.serverContent !== undefined;
}

export function isToolCallMessage(message: any): message is ToolCallMessage {
  return message && message.toolCall !== undefined;
}

export function isToolCallCancellationMessage(
  message: any
): message is ToolCallCancellationMessage {
  return message && message.toolCallCancellation !== undefined;
}

export function isInterrupted(content: ServerContent): content is InterruptedContent {
  return (content as InterruptedContent).interrupted === true;
}

export function isTurnComplete(
  content: ServerContent
): content is TurnCompleteContent {
  return (content as TurnCompleteContent).endOfTurn === true;
}

export function isModelTurn(content: ServerContent): content is ModelTurn {
  return (content as ModelTurn).modelTurn !== undefined;
} 