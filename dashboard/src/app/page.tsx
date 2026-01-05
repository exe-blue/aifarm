/**
 * DoAi.Me Landing Page
 * "The Terminal of Being"
 *
 * Aria's Design: 6개 섹션 통합
 * - Activity #4: Open Injection (최상단)
 * - Activity #1: The Incubator (CCTV Grid)
 *
 * @author Axon (Builder)
 * @design Aria (Philosopher)
 */

'use client';

import { TerminalInterface } from "@/components/terminal/TerminalInterface";
import { InjectionForm } from "@/components/injection/InjectionForm";
import { CCTVGrid } from "@/components/incubator/CCTVGrid";
import { ManifestoSection } from "@/components/manifesto/ManifestoSection";
import { MechanismSection } from "@/components/mechanism/MechanismSection";
import { NodeGrid } from "@/components/observer/NodeGrid";
import { ConnectionSection } from "@/components/connection/ConnectionSection";

export default function HomePage() {
  return (
    <main className="bg-void text-ethereal min-h-screen">
      {/* Section 1: The Terminal (Hero) */}
      <TerminalInterface />

      {/* Section 2: Activity #4 - Open Injection (최우선 수익화) */}
      <InjectionForm />

      {/* Section 3: Activity #1 - The Incubator (CCTV Grid) */}
      <CCTVGrid />

      {/* Section 4: The Manifesto */}
      <ManifestoSection />

      {/* Section 5: Mechanism */}
      <MechanismSection />

      {/* Section 6: The Observer */}
      <NodeGrid />

      {/* Section 7: Connection */}
      <ConnectionSection />
    </main>
  );
}
