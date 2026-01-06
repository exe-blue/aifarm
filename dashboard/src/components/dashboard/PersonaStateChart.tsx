"use client";

interface PersonaStateChartProps {
  active: number;
  waiting: number;
  fading: number;
  void_count: number;
}

export const PersonaStateChart = ({
  active,
  waiting,
  fading,
  void_count,
}: PersonaStateChartProps) => {
  const total = active + waiting + fading + void_count;

  const states = [
    { label: 'Active', value: active, color: 'var(--color-success)' },
    { label: 'Waiting', value: waiting, color: 'var(--color-primary)' },
    { label: 'Fading', value: fading, color: 'var(--color-warning)' },
    { label: 'Void', value: void_count, color: 'var(--color-error)' },
  ];

  return (
    <div className="theme-surface border theme-border rounded-lg p-6">
      <h2 className="text-lg theme-text font-medium mb-4">페르소나 상태 분포</h2>

      {total === 0 ? (
        <p className="text-sm theme-text-muted text-center py-8">
          등록된 페르소나가 없습니다
        </p>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="h-4 rounded-full overflow-hidden flex bg-[var(--color-elevated)] mb-4">
            {states.map((state, index) => {
              const width = (state.value / total) * 100;
              if (width === 0) return null;
              return (
                <div
                  key={state.label}
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${width}%`,
                    backgroundColor: state.color,
                  }}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {states.map((state) => (
              <div key={state.label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: state.color }}
                />
                <div>
                  <p className="text-xs theme-text-muted">{state.label}</p>
                  <p className="text-sm theme-text font-medium">
                    {state.value} ({total > 0 ? Math.round((state.value / total) * 100) : 0}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
