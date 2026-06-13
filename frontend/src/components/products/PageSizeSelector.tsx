'use client';

const OPTIONS = [5, 10, 20, 50] as const;

interface Props {
  value: number;
  onChange: (size: number) => void;
}

export default function PageSizeSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <label htmlFor="page-size" className="font-medium">
        Items per page:
      </label>
      <select
        id="page-size"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
