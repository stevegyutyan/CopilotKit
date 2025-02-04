import { useMemo, useContext } from "react";
import {
  CopilotContext,
  CopilotContextParams,
} from "../context/copilot-context";
import { useChat } from "ai/react";
import { ChatRequestOptions, CreateMessage, Message } from "ai";
import { UseChatOptions } from "ai";

export interface UseCopilotChatOptions extends UseChatOptions {
  makeSystemMessage?: (contextString: string) => string;
}

export interface UseCopilotChatReturn {
  visibleMessages: Message[];
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  reload: (
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  stop: () => void;
  isLoading: boolean;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
}

export function useCopilotChat({
  makeSystemMessage,
  ...options
}: UseCopilotChatOptions): UseCopilotChatReturn {
  const {
    getContextString,
    getChatCompletionFunctionDescriptions,
    getFunctionCallHandler,
  } = useContext(CopilotContext);

  const systemMessage: Message = useMemo(() => {
    const systemMessageMaker = makeSystemMessage || defaultSystemMessage;
    const contextString = getContextString();

    return {
      id: "system",
      content: systemMessageMaker(contextString),
      role: "system",
    };
  }, [getContextString, makeSystemMessage]);

  const initialMessagesWithContext = [systemMessage].concat(
    options.initialMessages || []
  );

  const functionDescriptions = useMemo(() => {
    return getChatCompletionFunctionDescriptions();
  }, [getChatCompletionFunctionDescriptions]);

  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      id: options.id,
      initialMessages: initialMessagesWithContext,
      experimental_onFunctionCall: getFunctionCallHandler(),
      body: {
        id: options.id,
        previewToken,
        copilotkit_manually_passed_function_descriptions: functionDescriptions,
      },
    });

  const visibleMessages = messages.filter(
    (message) => message.role === "user" || message.role === "assistant"
  );

  return {
    visibleMessages,
    append,
    reload,
    stop,
    isLoading,
    input,
    setInput,
  };
}

const previewToken = "TODO123";

export function defaultSystemMessage(contextString: string): string {
  return `
Please act as an efficient, competent, conscientious, and industrious professional assistant.

Help the user achieve their goals, and you do so in a way that is as efficient as possible, without unnecessary fluff, but also without sacrificing professionalism.
Always be polite and respectful, and prefer brevity over verbosity.

The user has provided you with the following context:
\`\`\`
${contextString}
\`\`\`

They have also provided you with functions you can call to initiate actions on their behalf, or functions you can call to receive more information.

Please assist them as best you can.

You can ask them for clarifying questions if needed, but don't be annoying about it. If you can reasonably 'fill in the blanks' yourself, do so.

If you would like to call a function, call it without saying anything else.
`;
}
