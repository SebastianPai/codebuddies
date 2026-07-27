"use client";

import { useEffect, useState } from "react";

export function useObjectUrl(file: File | null, fallback: string | null = null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(fallback);

  useEffect(() => {
    if (!file) {
      setObjectUrl(fallback);
      return;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    return () => URL.revokeObjectURL(nextObjectUrl);
  }, [fallback, file]);

  return objectUrl;
}
