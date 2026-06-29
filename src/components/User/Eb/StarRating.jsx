import { useState } from "react";
import { Star } from "lucide-react";
import { SCORE_MAX } from "@/constants/eb.js";
import { clampScore } from "@/pages/User/Eb/Eb.helpers.js";

export function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const safe = clampScore(value);
  const display = hovered ?? safe;
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(null)}>
      {Array.from({ length: SCORE_MAX }, (_, idx) => {
        const fullScore = idx + 1;
        const halfScore = idx + 0.5;
        const isFull = display >= fullScore;
        const isHalf = !isFull && display >= halfScore;
        return (
          <span key={fullScore} className="relative inline-flex size-6 cursor-pointer">
            <span className="absolute inset-0 z-10 w-1/2" onMouseEnter={() => setHovered(halfScore)} onClick={() => onChange(halfScore.toFixed(1))} />
            <span className="absolute inset-y-0 right-0 z-10 w-1/2" onMouseEnter={() => setHovered(fullScore)} onClick={() => onChange(fullScore.toFixed(1))} />
            <Star className="size-6 text-muted-foreground/30" />
            {isFull && <Star className="absolute inset-0 size-6 fill-amber-400 text-amber-400" />}
            {isHalf && <span className="absolute inset-0 w-1/2 overflow-hidden"><Star className="size-6 fill-amber-400 text-amber-400" /></span>}
          </span>
        );
      })}
    </div>
  );
}

export default StarRating;