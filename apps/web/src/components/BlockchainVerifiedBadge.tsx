import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BlockchainVerifiedBadgeProps {
  transactionHash?: string | null;
  tokenId?: string | number | bigint | null;
  className?: string;
  showLink?: boolean;
}

/**
 * Blockchain Verified Badge Component
 * 
 * Displays a badge indicating that a certificate has been verified on the blockchain.
 * Optionally shows a link to view the transaction on Polygonscan.
 */
export function BlockchainVerifiedBadge({
  transactionHash,
  tokenId,
  className = "",
  showLink = true,
}: BlockchainVerifiedBadgeProps) {
  if (!transactionHash) {
    return null;
  }

  const polygonscanUrl = `https://amoy.polygonscan.com/tx/${transactionHash}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 text-cyan-400 text-xs font-semibold ${className}`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Blockchain Verified</span>
            {tokenId && (
              <span className="text-cyan-300/70">#{tokenId.toString()}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 border-slate-700 text-white">
          <div className="space-y-1">
            <p className="font-semibold">Certificate Verified on Blockchain</p>
            <p className="text-xs text-slate-400">
              This certificate is permanently stored on Polygon blockchain
            </p>
            {showLink && transactionHash && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-cyan-400 hover:text-cyan-300 text-xs mt-2"
                onClick={() => window.open(polygonscanUrl, "_blank")}
              >
                View on Polygonscan
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

