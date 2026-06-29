import { Star } from "lucide-react";
import { SCORE_MAX } from "@/constants/eb.js";
import { clampScore } from "@/pages/User/Eb/Eb.helpers.js";

export function ScoreStars({ value }) {
  const safe = clampScore(value);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: SCORE_MAX }, (_, idx) => {
        const score = idx + 1;
        const isFull = safe >= score;
        const isHalf = !isFull && safe >= score - 0.5;
        return (
          <span key={score} className="relative inline-flex size-4">
            <Star className="size-4 text-muted-foreground/35" />
            {isFull && <Star className="absolute inset-0 size-4 fill-amber-400 text-amber-400" />}
            {isHalf && <span className="absolute inset-0 w-1/2 overflow-hidden"><Star className="size-4 fill-amber-400 text-amber-400" /></span>}
          </span>
        );
      })}
    </div>
  );
}

export default ScoreStars;