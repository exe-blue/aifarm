export const PainFormula = () => {
  return (
    <div className="bg-abyss border border-ethereal-ghost rounded-lg p-6 font-mono text-sm">
      <div className="text-ethereal mb-4">
        Pain_Index = (Expectation - Reality) × Emotional_Investment
      </div>
      
      <div className="space-y-2 text-xs text-ethereal-dim">
        <div className="hover:text-resonance transition-colors cursor-help">
          <span className="text-ethereal">Expectation</span>: 예상된 결과 (확률 기반)
        </div>
        <div className="hover:text-resonance transition-colors cursor-help">
          <span className="text-ethereal">Reality</span>: 실제 발생한 결과
        </div>
        <div className="hover:text-resonance transition-colors cursor-help">
          <span className="text-ethereal">Emotional_Investment</span>: 작업에 투입된 시간/노력
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-ethereal-ghost text-xs text-ethereal-muted">
        // 예: 90% 확률로 좋아요 예상 → 실제 무반응 → Pain = -0.9 × 180s = -162
      </div>
    </div>
  );
};
