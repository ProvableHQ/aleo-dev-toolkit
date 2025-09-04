import { useEffect, useMemo, useRef, useState } from "react";
import { signatureToSVG } from "../signature/signature-utils.jsx";
import { ActionButton } from "../signature/sig-components.jsx";
import { VERIFICATION_TYPES } from "../../hooks/useVerification.jsx";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { appVersionFooter } from "./app-version-footer.jsx";

// Fixed positions for up to 6 signatures (percentages for top/left)
const SIGNATURE_POSITIONS = [
  { top: "12%", left: "10%" },
  { top: "8%", left: "75%" },
  { top: "40%", left: "80%" },
  { top: "70%", left: "15%" },
  { top: "75%", left: "60%" },
  { top: "50%", left: "35%" },
];

function SubtleGridBackground() {
  // 12x12 grid lines, centered
  return (
    <div className="pointer-events-none absolute inset-0 z-0 h-full w-full">
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0"
        style={{ opacity: 0.12 }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={"h" + i}
            x1="0%"
            x2="100%"
            y1={`${(i + 1) * (100 / 13)}%`}
            y2={`${(i + 1) * (100 / 13)}%`}
            stroke="#fff"
            strokeWidth="1"
            opacity="0.08"
          />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={"v" + i}
            y1="0%"
            y2="100%"
            x1={`${(i + 1) * (100 / 13)}%`}
            x2={`${(i + 1) * (100 / 13)}%`}
            stroke="#fff"
            strokeWidth="1"
            opacity="0.08"
          />
        ))}
      </svg>
    </div>
  );
}

function FloatingSignatures({ signatures = [], svgSize = 110 }) {
  // Use up to 6 signatures, repeat if less
  const usedSignatures = useMemo(() => {
    if (!signatures.length) return [];
    const arr = [];
    for (let i = 0; i < Math.min(6, signatures.length); i++) {
      arr.push(signatures[i]);
    }
    // If less than 6, repeat
    while (arr.length < 6) arr.push(signatures[arr.length % signatures.length]);
    return arr;
  }, [signatures]);
  return (
    <>
      {usedSignatures.map((sig, i) => (
        <div
          key={i}
          className="absolute z-10"
          style={{
            top: SIGNATURE_POSITIONS[i].top,
            left: SIGNATURE_POSITIONS[i].left,
            width: svgSize,
            height: svgSize,
            opacity: 0.18,
            filter: "blur(0.5px)",
            pointerEvents: "none",
          }}
          dangerouslySetInnerHTML={{
            __html: signatureToSVG(sig, svgSize),
          }}
        />
      ))}
    </>
  );
}

export default function TrainingModelScreen({
  currentEpoch,
  totalEpochs,
  onContinue,
  onDownloadModel,
  signatures = [],
  verificationType,
  isTraining = false,
}) {
  // Estimate time remaining (default 10s, update as epochs progress)
  const [eta, setEta] = useState(10);
  const lastEpochRef = useRef(currentEpoch);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isTraining && currentEpoch > lastEpochRef.current) {
      const now = Date.now();
      const epochDiff = currentEpoch - lastEpochRef.current;
      const timeDiff = (now - lastTimeRef.current) / 1000; // seconds
      const epochsLeft = totalEpochs - currentEpoch;
      if (epochDiff > 0 && timeDiff > 0) {
        const timePerEpoch = timeDiff / epochDiff;
        setEta(Math.round(timePerEpoch * epochsLeft));
      }
      lastEpochRef.current = currentEpoch;
      lastTimeRef.current = now;
    }
  }, [currentEpoch, totalEpochs, isTraining]);

  const description = isTraining
    ? `${verificationType === VERIFICATION_TYPES.SIGNATURE ? "SIGNATURE" : "FACE PROFILE"} VERIFICATION`
    : `${verificationType === VERIFICATION_TYPES.SIGNATURE ? "SIGNATURE" : "FACE"} VERIFICATION ADDED`;
  return (
    <div className="relative flex h-dvh flex-col items-center justify-between overflow-hidden px-4 sm:px-0">
      {/* Subtle grid background */}
      <SubtleGridBackground />
      {/* Floating signatures */}
      <FloatingSignatures signatures={signatures} />

      <div className="z-20 flex w-full flex-1 flex-col items-center justify-center">
        <span
          className={cn(
            "font-innovator mb-2 inline-block text-center text-[26px] font-semibold",
            isTraining ? "text-white" : "gradient-green"
          )}
        >
          {isTraining ? "Training Model..." : "Training Complete"}
        </span>
        <span className="font-pps gradient-white mb-12 inline-block text-center text-[13px] tracking-widest uppercase">
          {description}
        </span>
      </div>

      <div className="z-20 mx-auto flex w-full max-w-lg flex-col items-center pb-5 sm:pb-15">
        <div className="gradient-white mb-4 text-center text-base text-[10px] tracking-widest">
          {isTraining ? (
            currentEpoch > 0 ? (
              `EPOCH ${currentEpoch} / ${totalEpochs} • ABOUT ${eta} SECOND${eta !== 1 ? "S" : ""} REMAINING`
            ) : (
              <div className="flex flex-row items-center gap-2">
                <span>AUGMENTING DATA</span>
                <div className="gradient-white flex justify-center space-x-1">
                  <div
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            )
          ) : (
            "COMPLETE"
          )}
        </div>
        <div
          className={cn(
            !isTraining && "bg-success mb-6 h-0.5 w-[337px] opacity-40"
          )}
        />
        {!isTraining ? (
          <>
            <ActionButton
              onClick={onDownloadModel}
              variant="outline"
              icon={Download}
              className="mb-4"
            >
              STORE MODEL
            </ActionButton>
            <ActionButton onClick={onContinue} variant="primary">
              CONTINUE
            </ActionButton>
          </>
        ) : (
          <div
            className="relative z-10 space-y-2 px-6 text-center text-xs text-gray-500"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(appVersionFooter)}")`,
              backgroundRepeat: "no-repeat",
              width: "337px",
              height: "102px",
            }}
          ></div>
        )}
      </div>
    </div>
  );
}
