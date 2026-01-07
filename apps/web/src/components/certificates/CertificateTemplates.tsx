import { useRef } from 'react';
import { Shield, GraduationCap, Zap, Palette } from 'lucide-react';
import CryptoJS from 'crypto-js';

export type CertificateTheme = 'classic' | 'academic' | 'tech' | 'creative';

interface CertificateRendererProps {
  theme: CertificateTheme;
  studentName: string;
  courseTitle: string;
  completionDate: string;
  educatorName?: string;
  userId?: string;
  courseId?: string;
  className?: string;
}

/**
 * Multi-theme Certificate Renderer Component
 * Supports 4 themes: classic, academic, tech, creative
 */
export function CertificateRenderer({
  theme,
  studentName,
  courseTitle,
  completionDate,
  educatorName = 'SkillChain Team',
  userId,
  courseId,
  className = '',
}: CertificateRendererProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  // Generate verification hash if userId and courseId are provided
  const verificationHash = userId && courseId 
    ? CryptoJS.SHA256(`${userId}-${courseId}-${completionDate}`).toString().toUpperCase()
    : null;

  // Render based on theme
  switch (theme) {
    case 'academic':
      return (
        <div
          ref={certificateRef}
          className={`w-[800px] h-[565px] bg-gradient-to-br from-amber-50 to-yellow-50 text-slate-900 relative flex-shrink-0 shadow-2xl ${className}`}
          style={{ fontFamily: "'Times New Roman', 'Georgia', serif" }}
        >
          {/* Academic Border */}
          <div className="absolute inset-4 border-double border-8 border-navy-900"></div>
          <div className="absolute inset-2 border-2 border-navy-700"></div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
            {/* Seal Icon */}
            <div className="mb-6">
              <div className="h-16 w-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <GraduationCap className="w-10 h-10 text-navy-900" />
              </div>
              <p className="text-navy-900 font-sans text-xs mt-2 tracking-widest uppercase font-bold">
                SkillChain Academic Verified
              </p>
            </div>

            <h1 className="text-5xl font-bold text-navy-900 mb-4 uppercase tracking-wide">Certificate</h1>
            <p className="text-2xl text-navy-700 italic mb-8 font-serif">of Completion</p>

            <p className="text-lg text-slate-700 mb-2 font-serif">This certifies that</p>
            <h2 className="text-4xl font-bold text-navy-900 mb-2 border-b-4 border-navy-900 pb-3 px-12 inline-block min-w-[400px] font-serif">
              {studentName}
            </h2>
            
            <p className="text-lg text-slate-700 mt-6 mb-2 font-serif">has successfully completed the course</p>
            <h3 className="text-3xl font-bold text-navy-900 mb-12 font-serif max-w-2xl">
              {courseTitle}
            </h3>

            <div className="flex justify-between w-full px-20 mt-auto items-end">
              <div className="text-center">
                <p className="text-lg font-bold border-t-2 border-navy-900 pt-2 px-4 font-serif">{completionDate}</p>
                <p className="text-xs text-navy-700 uppercase tracking-wider mt-1 font-sans">Date Completed</p>
              </div>
              
              {/* Gold Seal Badge */}
              <div className="h-28 w-28 rounded-full border-4 border-yellow-600 bg-yellow-500/20 flex items-center justify-center text-navy-900 shadow-lg">
                <span className="text-[10px] font-serif font-bold uppercase text-center leading-tight">Official<br/>Academic<br/>Award</span>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold border-t-2 border-navy-900 pt-2 px-4 font-serif">{educatorName}</p>
                <p className="text-xs text-navy-700 uppercase tracking-wider mt-1 font-sans">Instructor Signature</p>
              </div>
            </div>

            {/* Verification Hash Footer */}
            {verificationHash && (
              <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-[10px] text-navy-700 font-sans">
                  <Shield className="w-3 h-3" />
                  <span className="font-bold">Verification Hash:</span>
                </div>
                <p className="text-[9px] text-navy-600 font-mono tracking-wider break-all px-4 text-center max-w-full">
                  {verificationHash}
                </p>
              </div>
            )}
          </div>
        </div>
      );

    case 'tech':
      return (
        <div
          ref={certificateRef}
          className={`w-[800px] h-[565px] bg-slate-900 text-white relative flex-shrink-0 shadow-2xl ${className}`}
          style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
        >
          {/* Tech Border with Glow */}
          <div className="absolute inset-0 border-4 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]"></div>
          <div className="absolute inset-2 border border-cyan-400/50"></div>

          {/* Futuristic Watermark */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-64 h-64 border border-cyan-500 rotate-45"></div>
            <div className="absolute bottom-10 right-10 w-64 h-64 border border-cyan-500 rotate-45"></div>
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
            {/* Tech Icon */}
            <div className="mb-6">
              <div className="h-16 w-16 bg-cyan-500 rounded-lg flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/50 rotate-12">
                <Zap className="w-10 h-10 text-slate-900" />
              </div>
              <p className="text-cyan-400 font-sans text-xs mt-2 tracking-widest uppercase font-bold">
                SkillChain Verified
              </p>
            </div>

            <h1 className="text-5xl font-bold text-white mb-4 uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Certificate
            </h1>
            <p className="text-xl text-cyan-300 mb-8 font-mono uppercase tracking-widest">of Completion</p>

            <p className="text-base text-slate-300 mb-2 font-mono">This certifies that</p>
            <h2 className="text-4xl font-bold text-cyan-400 mb-2 border-b-2 border-cyan-500 pb-3 px-12 inline-block min-w-[400px] font-mono">
              {studentName}
            </h2>
            
            <p className="text-base text-slate-300 mt-6 mb-2 font-mono">has successfully completed</p>
            <h3 className="text-3xl font-bold text-white mb-12 font-mono max-w-2xl">
              {courseTitle}
            </h3>

            <div className="flex justify-between w-full px-20 mt-auto items-end">
              <div className="text-center">
                <p className="text-lg font-bold border-t-2 border-cyan-500 pt-2 px-4 font-mono text-cyan-400">{completionDate}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-1 font-mono">Date</p>
              </div>
              
              {/* Tech Badge */}
              <div className="h-28 w-28 rounded-lg border-4 border-cyan-500 bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/50">
                <span className="text-[10px] font-mono font-bold uppercase text-center leading-tight">Tech<br/>Verified<br/>Award</span>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold border-t-2 border-cyan-500 pt-2 px-4 font-mono text-cyan-400">{educatorName}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-1 font-mono">Instructor</p>
              </div>
            </div>

            {/* Verification Hash Footer */}
            {verificationHash && (
              <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1 bg-slate-800/50 py-2">
                <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-mono font-bold">
                  <Shield className="w-3 h-3" />
                  <span>BLOCKCHAIN HASH:</span>
                </div>
                <p className="text-[9px] text-cyan-300 font-mono tracking-wider break-all px-4 text-center max-w-full">
                  {verificationHash}
                </p>
              </div>
            )}
          </div>
        </div>
      );

    case 'creative':
      return (
        <div
          ref={certificateRef}
          className={`w-[800px] h-[565px] bg-white text-slate-900 relative flex-shrink-0 shadow-2xl ${className}`}
          style={{ fontFamily: "'Playfair Display', 'Crimson Text', serif" }}
        >
          {/* Creative Border with Pastel Accents */}
          <div className="absolute inset-4 border-4 border-pink-200"></div>
          <div className="absolute inset-2 border-2 border-purple-200"></div>

          {/* Decorative Corner Elements */}
          <div className="absolute top-6 left-6 w-12 h-12 border-2 border-pink-300 rotate-45 opacity-50"></div>
          <div className="absolute top-6 right-6 w-12 h-12 border-2 border-purple-300 rotate-45 opacity-50"></div>
          <div className="absolute bottom-6 left-6 w-12 h-12 border-2 border-blue-300 rotate-45 opacity-50"></div>
          <div className="absolute bottom-6 right-6 w-12 h-12 border-2 border-teal-300 rotate-45 opacity-50"></div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
            {/* Creative Icon */}
            <div className="mb-6">
              <div className="h-16 w-16 bg-gradient-to-br from-pink-300 to-purple-300 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <Palette className="w-10 h-10 text-white" />
              </div>
              <p className="text-pink-600 font-sans text-xs mt-2 tracking-widest uppercase font-semibold">
                SkillChain Creative Verified
              </p>
            </div>

            <h1 className="text-5xl font-bold text-slate-800 mb-4 uppercase tracking-wide">Certificate</h1>
            <p className="text-2xl text-pink-600 italic mb-8">of Completion</p>

            <p className="text-lg text-slate-600 mb-2">This certifies that</p>
            <h2 className="text-4xl font-bold text-purple-700 mb-2 border-b-2 border-pink-300 pb-3 px-12 inline-block min-w-[400px]">
              {studentName}
            </h2>
            
            <p className="text-lg text-slate-600 mt-6 mb-2">has successfully completed the course</p>
            <h3 className="text-3xl font-bold text-slate-800 mb-12 max-w-2xl">
              {courseTitle}
            </h3>

            <div className="flex justify-between w-full px-20 mt-auto items-end">
              <div className="text-center">
                <p className="text-lg font-bold border-t-2 border-pink-300 pt-2 px-4 text-pink-700">{completionDate}</p>
                <p className="text-xs text-pink-600 uppercase tracking-wider mt-1 font-sans">Date Completed</p>
              </div>
              
              {/* Creative Badge */}
              <div className="h-28 w-28 rounded-full border-4 border-pink-400 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-pink-700 shadow-lg">
                <span className="text-[10px] font-serif font-bold uppercase text-center leading-tight">Creative<br/>Achievement<br/>Award</span>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold border-t-2 border-purple-300 pt-2 px-4 text-purple-700">{educatorName}</p>
                <p className="text-xs text-purple-600 uppercase tracking-wider mt-1 font-sans">Instructor Signature</p>
              </div>
            </div>

            {/* Verification Hash Footer */}
            {verificationHash && (
              <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-[10px] text-pink-600 font-sans font-semibold">
                  <Shield className="w-3 h-3" />
                  <span>Verification Hash:</span>
                </div>
                <p className="text-[9px] text-pink-500 font-mono tracking-wider break-all px-4 text-center max-w-full">
                  {verificationHash}
                </p>
              </div>
            )}
          </div>
        </div>
      );

    default: // 'classic'
      return (
        <div
          ref={certificateRef}
          className={`w-[800px] h-[565px] bg-white text-slate-900 relative flex-shrink-0 shadow-2xl ${className}`}
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          {/* Classic Border */}
          <div className="absolute inset-4 border-[4px] border-double border-yellow-600"></div>
          <div className="absolute inset-2 border border-slate-300"></div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
            {/* Logo Placeholder */}
            <div className="mb-6">
              <div className="h-12 w-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-white font-sans font-bold text-xl">
                S
              </div>
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
                <p className="text-lg font-bold border-t border-slate-400 pt-2 px-4 font-script">{educatorName}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1 font-sans">Instructor Signature</p>
              </div>
            </div>

            {/* Verification Hash Footer */}
            {verificationHash && (
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
            )}
          </div>
        </div>
      );
  }
}

