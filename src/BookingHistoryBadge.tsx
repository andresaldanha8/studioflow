import React from "react";

type Props = {
  count: number;
  onClick: () => void;
};

export default function BookingHistoryBadge({ count, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
    >
      <span>🔄 Histórico ({count})</span>
    </button>
  );
}
