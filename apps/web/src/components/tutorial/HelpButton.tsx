"use client";

import { useState } from "react";
import { HelpModal } from "./HelpModal";
import { type TutorialKey } from "@/lib/tutorial/tutorial-content";

type Props = {
  tutorialKey: TutorialKey;
};

export function HelpButton({ tutorialKey }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 bg-card border-2 border-border shadow-lg rounded-full px-4 py-2.5 text-base font-semibold text-foreground flex items-center gap-1.5 z-40 active:bg-muted"
      >
        ❓ 도움말
      </button>

      <HelpModal
        tutorialKey={isOpen ? tutorialKey : null}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

export default HelpButton;
