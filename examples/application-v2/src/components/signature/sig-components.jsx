import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckIcon,
  CopyIcon,
  HelpCircle,
  RotateCcw,
  LoaderCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// Common UI Components
export const ScreenLayout = ({
  onBack,
  title,
  description,
  progressDots,
  tooltipText,
  children,
  showHelpButton = true,
}) => (
  <div className="flex h-svh flex-col text-white">
    <div className="flex items-center justify-between p-2 text-[13px] uppercase sm:p-6">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      {progressDots || title}
      {showHelpButton && (
        <Tooltip useTouch>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      )}
    </div>

    <div className="mb-2 text-center sm:mb-8">
      {progressDots && (
        <span className="font-innovator gradient-white mb-4 text-[26px] font-semibold">
          {title}
        </span>
      )}
      <p className="gradient-white mx-auto max-w-full px-2 text-[13px] leading-relaxed opacity-80 sm:max-w-[360px] sm:px-4">
        {description}
      </p>
    </div>

    {children}
  </div>
);

export const SignatureCanvas = ({
  canvasRef,
  onStartDrawing,
  onDraw,
  onStopDrawing,
  label,
  hasDrawn,
  onClear,
}) => {
  // Helper function to get coordinates from mouse or touch event
  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;

    if (event.touches && event.touches.length > 0) {
      // Touch event
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      // Mouse event
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Touch event handlers
  const handleTouchStart = (event) => {
    event.preventDefault();
    const coords = getCoordinates(event);
    onStartDrawing({
      ...event,
      clientX: coords.x + event.target.getBoundingClientRect().left,
      clientY: coords.y + event.target.getBoundingClientRect().top,
    });
  };

  const handleTouchMove = (event) => {
    event.preventDefault();
    const coords = getCoordinates(event);
    onDraw({
      ...event,
      clientX: coords.x + event.target.getBoundingClientRect().left,
      clientY: coords.y + event.target.getBoundingClientRect().top,
    });
  };

  const handleTouchEnd = (event) => {
    event.preventDefault();
    onStopDrawing(event);
  };

  return (
    <div className="w-fill mb-2 max-w-md rounded-[2px] border-2 border-gray-900 bg-[#111419] pb-2 sm:mb-8 sm:pb-6">
      <canvas
        ref={canvasRef}
        className="h-[280px] w-[280px] cursor-crosshair touch-none rounded-lg bg-[#111419] sm:h-[320px] sm:w-[320px]"
        onMouseDown={onStartDrawing}
        onMouseMove={onDraw}
        onMouseUp={onStopDrawing}
        onMouseLeave={onStopDrawing}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <div className="mt-4 text-center">
        {hasDrawn ? (
          <Button
            onClick={onClear}
            size="sm"
            className="h-7 rounded-full border-[0.5px] border-gray-700 bg-[#292c30] text-[11.5px] text-white hover:bg-gray-800 hover:text-white"
          >
            <RotateCcw className="h-2.5 w-3 text-gray-400" />
            CLEAR
          </Button>
        ) : (
          <p className="gradient-white text-[12px] leading-[32px] tracking-wider uppercase opacity-30">
            {label}
          </p>
        )}
      </div>
    </div>
  );
};

export const ActionButton = ({
  onClick,
  disabled = false,
  variant = "primary",
  icon: Icon,
  children,
  className = "",
  showLoaderOnClick = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const baseClasses =
    "max-w-md w-[353px] h-[42px] rounded-full text-[14px] font-medium flex items-center justify-center mx-auto";
  const variantClasses = {
    primary: "bg-gray-200 hover:bg-gray-300 text-gray-900",
    outline: "border-gray-600 text-gray-300 hover:bg-gray-800",
    success: "bg-success hover:bg-success/70 text-white",
  };

  const handleClick = async (event) => {
    if (showLoaderOnClick) {
      setIsLoading(true);
    }

    try {
      await onClick?.(event);
    } finally {
      if (showLoaderOnClick) {
        setIsLoading(false);
      }
    }
  };

  const isDisabled = disabled || isLoading;
  const showSpinner = isLoading && showLoaderOnClick;

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className} cursor-pointer disabled:cursor-not-allowed disabled:opacity-20`}
    >
      {showSpinner ? (
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <>{Icon && <Icon className="mr-2 h-4 w-4" />}</>
      )}
      {children}
    </Button>
  );
};

export function CopyButton({ value, copyText = "Copy" }) {
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  }, [hasCopied]);

  const copyToClipboard = useCallback((value) => {
    navigator.clipboard.writeText(value);
    setHasCopied(true);
  }, []);

  return (
    <ActionButton
      icon={hasCopied ? CheckIcon : CopyIcon}
      onClick={() => copyToClipboard(value)}
      className="bg-[#282b2f] text-white uppercase hover:bg-zinc-700"
    >
      {hasCopied ? "Copied" : copyText}
    </ActionButton>
  );
}
