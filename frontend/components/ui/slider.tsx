"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"
import { RaspberryIcon } from "@/components/icons/RaspberryIcon"

const Slider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SliderPrimitive.Root
        ref={ref}
        className={cn(
            "relative flex w-full touch-none select-none items-center",
            className
        )}
        {...props}
    >
        {/* Track: 8px height (h-2) */}
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200 border border-slate-300 cursor-pointer shadow-inner">
            <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-pink-400 via-fuchsia-500 to-indigo-500" />
        </SliderPrimitive.Track>

        {/* Thumb: 8px (h-2 w-2) - Tiny Raspberry - STRICT CONSTRAINTS */}
        <SliderPrimitive.Thumb className="flex !h-2 !w-2 shrink-0 items-center justify-center rounded-full bg-transparent shadow-none ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-125 active:scale-110 cursor-grab drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
            <RaspberryIcon className="h-full w-full object-contain filter hover:brightness-110 transition-all" />
        </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
