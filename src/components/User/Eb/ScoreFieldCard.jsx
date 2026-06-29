import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCORE_MAX } from "@/constants/eb.js";
import { clampScore } from "@/pages/User/Eb/Eb.helpers.js";
import { StarRating } from "@/components/User/Eb/StarRating.jsx";

export function ScoreFieldCard({ field, score, error, onScoreChange, onBlur }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={field.key}>{field.label}</Label>
          <span className="text-sm font-semibold tabular-nums text-foreground">{clampScore(score).toFixed(1)} / {SCORE_MAX}</span>
        </div>
        <p className="text-xs text-muted-foreground">{field.hint}</p>
        <StarRating value={score} onChange={onScoreChange} />
      </div>
      <Input
        id={field.key}
        type="number"
        inputMode="decimal"
        min="0"
        max={String(SCORE_MAX)}
        step="0.5"
        value={score}
        onChange={(e) => onScoreChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
      />
      {error
        ? <p className="text-xs text-red-600">{error}</p>
        : <p className="text-xs text-muted-foreground">Nhập điểm hoặc click ngôi sao. Bước 0.5.</p>}
    </div>
  );
}

export default ScoreFieldCard;