// This service is disabled for Google Apps Script deployment.
// @google/genai cannot run directly in the browser/GAS client without a backend proxy.

export const checkApiKey = (): boolean => {
    return false;
};

export const createChatSession = (): any => {
    throw new Error("AI features are disabled in this build.");
};

export const generateImage = async (
  prompt: string,
  size: '1K' | '2K' | '4K' = '1K'
): Promise<string | null> => {
    throw new Error("AI features are disabled in this build.");
};