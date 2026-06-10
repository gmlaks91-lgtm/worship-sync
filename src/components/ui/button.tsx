import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-sky-200 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-sky-500 text-white shadow-sm hover:bg-sky-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-sky-200",
        accent:
          "bg-rose-400 text-white shadow-sm hover:bg-rose-500 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50/60 hover:text-sky-700 active:scale-[0.98] aria-expanded:bg-sky-50 aria-expanded:text-sky-700",
        secondary:
          "bg-rose-50 text-rose-700 shadow-sm hover:bg-rose-100 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] aria-expanded:bg-rose-100",
        ghost:
          "text-slate-600 hover:bg-sky-50/80 hover:text-sky-700 active:scale-[0.98] aria-expanded:bg-sky-50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-sky-600 underline-offset-4 hover:text-sky-700 hover:underline",
      },
      size: {
        default:
          "h-9 gap-2 px-3.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-lg in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-lg in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
