import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  Mail, 
  User, 
  Phone, 
  Globe, 
  Users, 
  FileText,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Sparkles,
  Shield,
  Zap,
  Award,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

// Floating particles component
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: [null, Math.random() * -200 - 100],
            x: [null, (Math.random() - 0.5) * 100],
            opacity: [0.3, 0.8, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

// Animated background grid
const AnimatedGrid = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
    </div>
  );
};

// Feature card component
const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300 hover:border-cyan-500/30 group"
  >
    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
      <Icon className="h-5 w-5 text-cyan-400" />
    </div>
    <h4 className="font-semibold text-white mb-1">{title}</h4>
    <p className="text-sm text-slate-400">{description}</p>
  </motion.div>
);

// Form step indicator
const StepIndicator = ({ step, currentStep, label }: { step: number, currentStep: number, label: string }) => (
  <div className="flex items-center gap-2">
    <motion.div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
        currentStep >= step 
          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
          : 'bg-white/10 text-slate-400'
      }`}
      animate={currentStep === step ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {currentStep > step ? <CheckCircle2 className="h-4 w-4" /> : step}
    </motion.div>
    <span className={`text-sm hidden sm:block ${currentStep >= step ? 'text-white' : 'text-slate-500'}`}>
      {label}
    </span>
  </div>
);

export function OrgRequestPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    orgName: '',
    orgDescription: '',
    orgWebsite: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    reason: '',
    expectedMembers: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      return formData.orgName.trim().length > 0;
    }
    if (step === 2) {
      return formData.contactName.trim().length > 0 && formData.contactEmail.trim().length > 0;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    } else {
      toast.error('Please fill in required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(1) || !validateStep(2)) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('org_requests')
        .insert({
          org_name: formData.orgName.trim(),
          org_description: formData.orgDescription.trim() || null,
          org_website: formData.orgWebsite.trim() || null,
          contact_name: formData.contactName.trim(),
          contact_email: formData.contactEmail.trim().toLowerCase(),
          contact_phone: formData.contactPhone.trim() || null,
          reason: formData.reason.trim() || null,
          expected_members: formData.expectedMembers ? parseInt(formData.expectedMembers) : null,
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <AnimatedGrid />
        <FloatingParticles />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-3"
            >
              Application Submitted!
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-400 mb-6"
            >
              Thank you for your interest in SkillChain. Our team will review your application 
              and get back to you within 2-3 business days.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-800/50 rounded-lg p-4 mb-6"
            >
              <p className="text-sm text-slate-300">
                Confirmation sent to
              </p>
              <p className="text-cyan-400 font-medium">{formData.contactEmail}</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link to="/">
                <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <AnimatedGrid />
      <FloatingParticles />
      
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      
      <div className="relative z-10 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link 
              to="/" 
              className="inline-flex items-center text-slate-400 hover:text-cyan-400 mb-8 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left side - Features */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl font-bold text-white mb-4">
                  Empower Your
                  <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"> Organization</span>
                </h1>
                <p className="text-slate-400 text-lg">
                  Join hundreds of organizations using SkillChain to deliver world-class learning experiences.
                </p>
              </motion.div>

              <div className="grid gap-4">
                <FeatureCard
                  icon={Shield}
                  title="Enterprise Security"
                  description="Bank-grade encryption and compliance with industry standards"
                  delay={0.2}
                />
                <FeatureCard
                  icon={Zap}
                  title="AI-Powered Learning"
                  description="Personalized learning paths powered by advanced AI"
                  delay={0.3}
                />
                <FeatureCard
                  icon={Award}
                  title="Blockchain Certificates"
                  description="Verifiable credentials stored on the blockchain"
                  delay={0.4}
                />
                <FeatureCard
                  icon={Users}
                  title="Team Management"
                  description="Easily manage learners and track progress"
                  delay={0.5}
                />
              </div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">500+</div>
                  <div className="text-xs text-slate-400">Organizations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">50K+</div>
                  <div className="text-xs text-slate-400">Learners</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">98%</div>
                  <div className="text-xs text-slate-400">Satisfaction</div>
                </div>
              </motion.div>
            </div>

            {/* Right side - Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
                {/* Step indicators */}
                <div className="flex items-center justify-between mb-8">
                  <StepIndicator step={1} currentStep={currentStep} label="Organization" />
                  <div className="flex-1 h-px bg-white/10 mx-2" />
                  <StepIndicator step={2} currentStep={currentStep} label="Contact" />
                  <div className="flex-1 h-px bg-white/10 mx-2" />
                  <StepIndicator step={3} currentStep={currentStep} label="Details" />
                </div>

                <form onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">
                    {/* Step 1: Organization Info */}
                    {currentStep === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white">Organization Details</h3>
                            <p className="text-sm text-slate-400">Tell us about your organization</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="orgName" className="text-slate-200 flex items-center gap-1">
                            Organization Name <span className="text-cyan-400">*</span>
                          </Label>
                          <Input
                            id="orgName"
                            name="orgName"
                            value={formData.orgName}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('orgName')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="Enter your organization name"
                            className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12 transition-all duration-300 ${
                              focusedField === 'orgName' ? 'border-cyan-500 ring-2 ring-cyan-500/20' : ''
                            }`}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="orgDescription" className="text-slate-200">Description</Label>
                          <Textarea
                            id="orgDescription"
                            name="orgDescription"
                            value={formData.orgDescription}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('orgDescription')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="Tell us about your organization, its mission, and goals..."
                            rows={4}
                            className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 transition-all duration-300 ${
                              focusedField === 'orgDescription' ? 'border-cyan-500 ring-2 ring-cyan-500/20' : ''
                            }`}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="orgWebsite" className="text-slate-200 flex items-center gap-2">
                            <Globe className="h-4 w-4 text-slate-400" />
                            Website
                          </Label>
                          <Input
                            id="orgWebsite"
                            name="orgWebsite"
                            type="url"
                            value={formData.orgWebsite}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('orgWebsite')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="https://your-organization.com"
                            className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12 transition-all duration-300 ${
                              focusedField === 'orgWebsite' ? 'border-cyan-500 ring-2 ring-cyan-500/20' : ''
                            }`}
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Step 2: Contact Info */}
                    {currentStep === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white">Contact Information</h3>
                            <p className="text-sm text-slate-400">How can we reach you?</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="contactName" className="text-slate-200 flex items-center gap-1">
                              Full Name <span className="text-cyan-400">*</span>
                            </Label>
                            <Input
                              id="contactName"
                              name="contactName"
                              value={formData.contactName}
                              onChange={handleChange}
                              onFocus={() => setFocusedField('contactName')}
                              onBlur={() => setFocusedField(null)}
                              placeholder="John Doe"
                              className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12 transition-all duration-300 ${
                                focusedField === 'contactName' ? 'border-cyan-500 ring-2 ring-cyan-500/20' : ''
                              }`}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="contactPhone" className="text-slate-200 flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              Phone
                            </Label>
                            <Input
                              id="contactPhone"
                              name="contactPhone"
                              type="tel"
                              value={formData.contactPhone}
                              onChange={handleChange}
                              onFocus={() => setFocusedField('contactPhone')}
                              onBlur={() => setFocusedField(null)}
                              placeholder="+60 12-345 6789"
                              className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12 transition-all duration-300 ${
                                focusedField === 'contactPhone' ? 'border-cyan-500 ring-2 ring-cyan-500/20' : ''
                              }`}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="contactEmail" className="text-slate-200 flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            Email <span className="text-cyan-400">*</span>
                          </Label>
                          <Input
                            id="contactEmail"
                            name="contactEmail"
                            type="email"
                            value={formData.contactEmail}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('contactEmail')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="john@organization.com"
                            className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12 transition-all duration-300 ${
                              focusedField === 'contactEmail' ? 'border-cyan-500 ring-2 ring-cyan-500/20' : ''
                            }`}
                            required
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* Step 3: Additional Info */}
                    {currentStep === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-5"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white">Almost There!</h3>
                            <p className="text-sm text-slate-400">A few more details to help us serve you better</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="expectedMembers" className="text-slate-200 flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            Expected Number of Learners
                          </Label>
                          <Input
                            id="expectedMembers"
                            name="expectedMembers"
                            type="number"
                            min="1"
                            value={formData.expectedMembers}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('expectedMembers')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="50"
                            className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-12 transition-all duration-300 ${
                              focusedField === 'expectedMembers' ? 'border-cyan-500 ring-2 ring-cyan-500/20' : ''
                            }`}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="reason" className="text-slate-200 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            Why do you want to use SkillChain?
                          </Label>
                          <Textarea
                            id="reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            onFocus={() => setFocusedField('reason')}
                            onBlur={() => setFocusedField(null)}
                            placeholder="Tell us about your learning goals, challenges you're facing, and how you plan to use SkillChain..."
                            rows={5}
                            className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 transition-all duration-300 ${
                              focusedField === 'reason' ? 'border-cyan-500 ring-2 ring-cyan-500/20' : ''
                            }`}
                          />
                        </div>

                        {/* Summary */}
                        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                          <h4 className="text-sm font-medium text-slate-300 mb-3">Application Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Organization:</span>
                              <span className="text-white">{formData.orgName || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Contact:</span>
                              <span className="text-white">{formData.contactName || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Email:</span>
                              <span className="text-cyan-400">{formData.contactEmail || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700/50">
                    {currentStep > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={prevStep}
                        className="text-slate-400 hover:text-white"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                    ) : (
                      <div />
                    )}

                    {currentStep < 3 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0"
                      >
                        Continue
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 min-w-[150px]"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Submit Application
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-500 text-center mt-4">
                    By submitting, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
