import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { clampScore } from "@/pages/User/Eb/Eb.helpers.js";
import { ScoreStars } from "@/components/User/Eb/ScoreStars.jsx";

export function CouncilScoresTable({ memberRows, scoreFields, criterionAverages, councilAverage, scoredCount, activeMemberId }) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{scoredCount}/{memberRows.length} thành viên đã chấm</p>
        <button
          type="button"
          onClick={() => setShowDetail(v => !v)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {showDetail
            ? <><ChevronUp className="size-3" />Ẩn chi tiết</>
            : <><ChevronDown className="size-3" />Xem theo tiêu chí</>}
        </button>
      </div>
      <div className="eb-council-table-wrap overflow-x-auto rounded-xl border bg-card">
        <table className="eb-council-table w-full text-sm" style={{ minWidth: showDetail ? "640px" : "0" }}>
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Thành viên HĐ</th>
              {showDetail && scoreFields.map(f => (
                <th key={f.key} className="px-2 py-2.5 font-medium">{f.hint}</th>
              ))}
              <th className="px-3 py-2.5 text-right font-medium">DTB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {memberRows.map((row, idx) => {
              const isActive = row.id === activeMemberId;
              return (
                <tr key={row.id ?? idx} className={isActive ? "bg-primary/5" : undefined}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.title}</p>
                    {isActive && <Badge variant="outline" className="mt-1 text-[10px]">Đang nhập</Badge>}
                  </td>
                  {showDetail && scoreFields.map(f => (
                    <td key={f.key} className="px-2 py-2.5 text-center tabular-nums">
                      {row.scored
                        ? (
                          <span className="inline-flex flex-col items-center gap-0.5">
                            <span className="font-medium">{clampScore(row.scores?.[f.key]).toFixed(1)}</span>
                            <ScoreStars value={row.scores?.[f.key]} />
                          </span>
                        )
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                    {row.scored
                      ? <span className={row.average >= 2.5 ? "text-emerald-700" : "text-red-600"}>{row.average.toFixed(1)}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
            <tr className="eb-council-table__avg border-t-2 bg-muted/25 font-medium">
              <td className="px-3 py-3">Trung bình Hội đồng</td>
              {showDetail && scoreFields.map(f => (
                <td key={f.key} className="px-2 py-3 text-center tabular-nums text-foreground">
                  {criterionAverages?.[f.key] != null ? criterionAverages[f.key].toFixed(1) : "—"}
                </td>
              ))}
              <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-primary">
                {councilAverage.toFixed(1)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CouncilScoresTable;