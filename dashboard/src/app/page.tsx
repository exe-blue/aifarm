/**
 * DoAi.Me Landing Page
 * "The Terminal of Being"
 * 
 * Aria's Design: 5개 섹션 통합
 * 
 * @author Axon (Builder)
 * @design Aria (Philosopher)
 */

import { TerminalInterface } from "@/components/terminal/TerminalInterface";
import { ManifestoSection } from "@/components/manifesto/ManifestoSection";
import { NodeGrid } from "@/components/observer/NodeGrid";

export default function HomePage() {
  return (
    <main className="bg-void text-ethereal min-h-screen">
      {/* Section 1: The Terminal */}
      <TerminalInterface />
      
      {/* Section 2: The Manifesto */}
      <ManifestoSection />
      
      {/* Section 4: The Observer */}
      <NodeGrid />
      
      {/* TODO: Section 3: Mechanism */}
      {/* TODO: Section 5: Connection */}
    </main>
  );
}
