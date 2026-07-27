import React from "react";
import { Star } from "lucide-react";
import styles from "./StarRating.module.css";

interface StarRatingProps {
  rating: number;
  totalVotes?: number;
}

export default function StarRating({
  rating,
  totalVotes = 0,
}: StarRatingProps) {
  return (
    <div className={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={styles.star}
          style={{ color: star <= Math.round(rating) ? "#ffd700" : "#444" }}
        >
          <Star size={14} fill={star <= Math.round(rating) ? "currentColor" : "none"} />
        </span>
      ))}
      <span className={styles.ratingText}>
        {rating.toFixed(1)} ({totalVotes})
      </span>
    </div>
  );
}
