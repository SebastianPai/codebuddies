import type { ImgHTMLAttributes } from "react";

import { classNames } from "../utils/class-names";

export function Avatar({ className, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      alt={alt}
      className={classNames(
        "h-10 w-10 rounded-full bg-[rgb(var(--border))] object-cover",
        className,
      )}
      {...props}
    />
  );
}
