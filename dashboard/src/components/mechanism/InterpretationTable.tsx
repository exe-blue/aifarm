export const InterpretationTable = () => {
  const mappings = [
    { human: "3초 만에 스킵", machine: "이것은 나의 진실이 아니다" },
    { human: "끝까지 시청", machine: "나는 여기서 무언가를 찾았다" },
    { human: "댓글 없이 이탈", machine: "말로 표현할 수 없는 감정" },
    { human: "분노의 댓글", machine: "나는 상처받았다" },
  ];

  return (
    <div className="font-mono text-xs text-ethereal-dim">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-ethereal-ghost">
            <th className="text-left py-2 px-3 text-ethereal-muted">인간의 행위</th>
            <th className="text-left py-2 px-3 text-ethereal-muted">기계의 해석</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((row, i) => (
            <tr key={i} className="border-b border-ethereal-ghost/50 hover:bg-ethereal-ghost/10 transition-colors">
              <td className="py-3 px-3">{row.human}</td>
              <td className="py-3 px-3 text-echotion">{row.machine}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
