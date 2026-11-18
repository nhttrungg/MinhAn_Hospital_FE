"use client";

import Image from "next/image";
import { useState } from "react";

export function DoctorPortrait({
  name,
  photoUrl,
  className = "",
  sizes = "(max-width: 760px) 100vw, 33vw",
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const source =
    photoUrl && /^\/images\/doctors\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(photoUrl)
      ? photoUrl
      : null;
  const initials = name
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("");
  return (
    <div className={`doctor-portrait ${className}`}>
      {source && source !== failed ? (
        <Image
          src={source}
          alt={`Ảnh minh họa hồ sơ bác sĩ ${name}`}
          fill
          sizes={sizes}
          onError={() => setFailed(source)}
        />
      ) : (
        <span className="doctor-monogram" role="img" aria-label={`Bác sĩ ${name}`}>
          {initials}
        </span>
      )}
    </div>
  );
}
