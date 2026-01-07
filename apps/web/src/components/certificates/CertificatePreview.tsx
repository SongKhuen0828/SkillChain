import { useState, useRef } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificateRenderer, type CertificateTheme } from "./CertificateTemplates";
import { uploadAndMintCertificate } from "@/lib/blockchain/BlockchainService";
import { toast } from "sonner";
import CryptoJS from "crypto-js";

interface CertificatePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  courseTitle: string;
  courseId: string;
  userId: string;
  theme: CertificateTheme;
  completionDate: string;
  educatorName?: string;
  studentAddress?: string;
  onMintSuccess?: (data: { transactionHash: string; tokenId: bigint; ipfsHash: string }) => void;
}

/**
 * Certificate Preview Modal with Blockchain Minting
 * 
 * Shows a preview of the certificate and allows the student to confirm
 * and mint it on the blockchain.
 */
export function CertificatePreview({
  isOpen,
  onClose,
  studentName,
  courseTitle,
  courseId,
  userId,
  theme,
  completionDate,
  educatorName,
  studentAddress = "0x0000000000000000000000000000000000000000",
  onMintSuccess,
}: CertificatePreviewProps) {
  const [isMinting, setIsMinting] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Generate verification hash for display
  const verificationHash = CryptoJS.SHA256(`${userId}-${courseId}-${completionDate}`)
    .toString()
    .toUpperCase();

  const handleConfirmAndMint = async () => {
    if (!certificateRef.current) {
      toast.error("Certificate element not found");
      return;
    }

    setIsMinting(true);

    try {
      toast.info("Starting blockchain minting process...");

      const result = await uploadAndMintCertificate(
        certificateRef.current,
        studentAddress,
        studentName,
        courseTitle,
        courseId,
        userId,
        completionDate,
        educatorName
      );

      toast.success("Certificate minted successfully on blockchain! 🎓");

      // Call success callback
      if (onMintSuccess) {
        onMintSuccess(result);
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error("Certificate minting failed:", error);
      toast.error(`Failed to mint certificate: ${error.message}`);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden max-w-5xl w-full flex flex-col relative max-h-[95vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Certificate Preview</h3>
            <p className="text-sm text-slate-400 mt-1">
              Review your certificate before minting on the blockchain
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isMinting}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Certificate Preview Area (Scrollable) */}
        <div className="p-8 overflow-auto bg-slate-800/50 flex justify-center flex-1">
          <div ref={certificateRef}>
            <CertificateRenderer
              theme={theme}
              studentName={studentName}
              courseTitle={courseTitle}
              completionDate={completionDate}
              educatorName={educatorName}
              userId={userId}
              courseId={courseId}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 space-y-4">
          {/* Information */}
          <div className="flex items-start gap-3 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-cyan-100">
              <p className="font-semibold mb-1">Blockchain Verification</p>
              <p className="text-cyan-200/80">
                This certificate will be permanently stored on Polygon blockchain as an NFT.
                The verification hash ensures authenticity.
              </p>
              <p className="text-xs text-cyan-300/70 mt-2 font-mono break-all">
                Hash: {verificationHash.slice(0, 32)}...
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isMinting}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAndMint}
              disabled={isMinting}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-cyan-500/20 px-8"
            >
              {isMinting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Minting on Blockchain...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm & Mint on Blockchain
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

