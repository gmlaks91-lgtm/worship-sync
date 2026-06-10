import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-1 text-base text-slate-800 shadow-sm transition-all duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-700 placeholder:text-slate-400 focus-visible:border-sky-300 focus-visible:ring-[3px] focus-visible:ring-sky-100 hover:border-sky-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
