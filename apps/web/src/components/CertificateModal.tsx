import { useRef, useState } from 'react';
import { Download, X, Loader2, Shield } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CryptoJS from 'crypto-js';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  courseTitle: string;
  completionDate: string;
  userId?: string;
  courseId?: string;
  txHash?: string; // Blockchain transaction hash for verification
  organizationLogoUrl?: string; // Organization logo URL for branding
}

export function CertificateModal({ isOpen, onClose, studentName, courseTitle, completionDate, userId, courseId, txHash, organizationLogoUrl }: CertificateModalProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [certificateId] = useState(() => crypto.randomUUID().slice(0, 8).toUpperCase());
  
  // Generate verification hash if userId and courseId are provided
  const verificationHash = userId && courseId 
    ? CryptoJS.SHA256(`${userId}-${courseId}-${completionDate}`).toString().toUpperCase()
    : null;

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!certificateRef.current) return;
    setIsGenerating(true);

    try {
      // 1. Capture the certificate as a canvas
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      // 2. Initialize PDF (Landscape, A4)
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // 3. Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // 4. Save
      pdf.save(`SkillChain-Certificate-${courseTitle.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Certificate generation failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate verification URL
  const verificationUrl = txHash 
    ? `${window.location.origin}/verify/tx/${txHash}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden max-w-4xl w-full flex flex-col relative">
        
        {/* Header Controls */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h3 className="text-lg font-medium text-white">Course Certificate</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Certificate Preview Area (Scrollable on mobile) */}
        <div className="p-8 overflow-auto bg-slate-800/50 flex justify-center">
          
          {/* THE CERTIFICATE DESIGN (A4 Ratio) */}
          <div 
            ref={certificateRef}
            className="w-[800px] h-[565px] bg-white text-slate-900 relative flex-shrink-0 shadow-2xl"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            {/* Ornamental Border */}
            <div className="absolute inset-4 border-[4px] border-double border-yellow-600"></div>
            <div className="absolute inset-2 border border-slate-300"></div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
              
              {/* Logo - Organization or Default */}
              <div className="mb-6">
                {organizationLogoUrl ? (
                  <img 
                    src={organizationLogoUrl} 
                    alt="Organization Logo"
                    className="h-16 w-16 mx-auto object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-white font-sans font-bold text-xl">
                    S
                  </div>
                )}
                <p className="text-slate-500 font-sans text-xs mt-2 tracking-widest uppercase">SkillChain Verified</p>
              </div>

              <h1 className="text-5xl font-bold text-slate-800 mb-4 uppercase tracking-wide">Certificate</h1>
              <p className="text-xl text-slate-500 italic mb-8">of Completion</p>

              <p className="text-lg text-slate-600 mb-2 font-sans">This certifies that</p>
              <h2 className="text-4xl font-bold text-teal-700 mb-2 border-b-2 border-slate-200 pb-2 px-8 inline-block min-w-[300px]">
                {studentName}
              </h2>
              
              <p className="text-lg text-slate-600 mt-6 mb-2 font-sans">has successfully completed the course</p>
              <h3 className="text-3xl font-bold text-slate-800 mb-12">
                {courseTitle}
              </h3>

              <div className="flex justify-between w-full px-16 mt-auto items-end">
                <div className="text-center">
                  <p className="text-lg font-bold border-t border-slate-400 pt-2 px-4">{completionDate}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-sans">Date Completed</p>
                </div>
                
                {/* Badge */}
                <div className="h-24 w-24 rounded-full border-4 border-yellow-600 flex items-center justify-center text-yellow-700 opacity-80">
                  <span className="text-[10px] font-sans font-bold uppercase text-center leading-tight">Official<br/>SkillChain<br/>Award</span>
                </div>

                <div className="text-center">
                  <p className="text-lg font-bold border-t border-slate-400 pt-2 px-4 font-script">SkillChain Team</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-sans">Instructor Signature</p>
                </div>
              </div>

              {/* Verification Hash Footer */}
              {verificationHash ? (
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-sans">
                    <Shield className="w-3 h-3" />
                    <span>Blockchain Verification Hash:</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono tracking-wider break-all px-4 text-center max-w-full">
                    {verificationHash}
                  </p>
                  <p className="text-[8px] text-slate-400 font-sans italic">
                    SHA-256({userId?.slice(0, 8)}...-{courseId?.slice(0, 8)}...-{completionDate})
                  </p>
                </div>
              ) : (
                <p className="absolute bottom-6 text-[10px] text-slate-300 font-sans">
                  Certificate ID: {certificateId}
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900">
          {/* QR Code Section (if txHash exists) */}
          {verificationUrl && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg">
                <QRCodeSVG 
                  value={verificationUrl}
                  size={64}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-xs text-slate-400 max-w-[200px]">
                <p className="font-semibold text-slate-300 mb-1">Verify Certificate</p>
                <p>Scan QR code to verify authenticity on blockchain</p>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 ml-auto">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button onClick={handleDownload} disabled={isGenerating} className="bg-primary hover:bg-primary/90">
              {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2" />}
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

