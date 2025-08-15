export default function Notepad({ value, onChange }) {
  return (
    <textarea
      autoFocus
      placeholder="Start writing... ShipMode is listening"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-full p-8 text-lg leading-relaxed bg-transparent resize-none outline-none placeholder-neutral-500 dark:placeholder-neutral-400"
      spellCheck={false}
    />
  );
}
