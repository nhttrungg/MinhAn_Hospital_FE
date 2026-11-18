"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import styles from "./star-rating.module.css";

export const satisfactionLabels = [
  "Rất không hài lòng",
  "Không hài lòng",
  "Bình thường",
  "Hài lòng",
  "Rất hài lòng",
];

/** Decorative stars; the containing summary provides the accessible numeric value. */
export function RatingStars({ rating, size = 16 }: { rating: number; size?: number }) {
  const value = Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
  return (
    <span className={styles.stars} aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <span className={styles.star} key={index} style={{ width: size, height: size }}>
          <Star size={size} className={styles.outline} />
          <span
            className={styles.fill}
            style={{ width: `${Math.max(0, Math.min(1, value - index)) * 100}%` }}
          >
            <Star size={size} fill="currentColor" />
          </span>
        </span>
      ))}
    </span>
  );
}

/** Native radios preserve arrow-key navigation, Space selection and form semantics. */
export function StarRatingInput({
  name,
  value,
  onChange,
  disabled = false,
}: {
  name: string;
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value;
  return (
    <div className={styles.input}>
      <div className={styles.choices} onMouseLeave={() => setPreview(null)}>
        {satisfactionLabels.map((label, index) => {
          const rating = index + 1;
          return (
            <label
              key={rating}
              className={styles.choice}
              data-filled={rating <= shown}
              data-disabled={disabled}
              onMouseEnter={() => {
                if (!disabled) setPreview(rating);
              }}
            >
              <input
                type="radio"
                name={name}
                value={rating}
                checked={value === rating}
                required
                disabled={disabled}
                aria-label={`${rating} sao — ${label}`}
                onChange={() => {
                  setPreview(null);
                  onChange(rating);
                }}
              />
              <Star size={28} fill={rating <= shown ? "currentColor" : "none"} aria-hidden="true" />
            </label>
          );
        })}
      </div>
      <p className={styles.feedback} role="status" aria-live="polite" aria-atomic="true">
        {value
          ? `${value}/5 · ${satisfactionLabels[value - 1]}`
          : "Chọn số sao để chia sẻ mức độ hài lòng của bạn."}
      </p>
      <p className={styles.help}>
        1: Rất không hài lòng · 2: Không hài lòng · 3: Bình thường · 4: Hài lòng · 5: Rất hài lòng
      </p>
    </div>
  );
}
