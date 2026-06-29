import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function ThresholdTable() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border/50">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="font-medium uppercase tracking-wider">Bảng ngưỡng xếp loại</span>
        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>
      {open && (
        <div className="border-t px-3 pb-3 pt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Dưới 2.5 điểm</span><span className="font-medium text-red-700">KHÔNG ĐẠT</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Từ 2.5 đến dưới 3.5 điểm</span><span className="font-medium text-amber-700">ĐẠT</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Từ 3.5 đến dưới 4.25 điểm</span><span className="font-medium text-sky-700">TỐT</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Từ 4.25 đến 5.0 điểm</span><span className="font-medium text-emerald-700">XUẤT SẮC</span></div>
        </div>
      )}
    </div>
  );
}

export default ThresholdTable;