import { createContext, useContext, useState } from "react";

interface GenerationContextType {
  isOpen: boolean;
  context?: string;
  emotionalContext?: string;
  openPanel: (context?: string, emotionalContext?: string) => void;
  closePanel: () => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<string>();
  const [emotionalContext, setEmotionalContext] = useState<string>();

  const openPanel = (ctx?: string, emotional?: string) => {
    setContext(ctx);
    setEmotionalContext(emotional);
    setIsOpen(true);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  return (
    <GenerationContext.Provider
      value={{
        isOpen,
        context,
        emotionalContext,
        openPanel,
        closePanel,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error("useGeneration must be used within GenerationProvider");
  }
  return {
    ...context,
    onClose: context.closePanel, // Add alias for compatibility
  };
}
