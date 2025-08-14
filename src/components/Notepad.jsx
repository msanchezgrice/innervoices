export default function Notepad({ value, onChange }) {
  return (
    <textarea
      placeholder="Start writing... InnerVoice is listening"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-full p-8 text-lg leading-relaxed bg-transparent resize-none outline-none"
      spellCheck={false}
    />
  );
}
