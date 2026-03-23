import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-primary-100 selection:text-primary-900">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-12 uppercase tracking-widest">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-[40px] p-12 shadow-sm border border-slate-100">
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-4 tracking-tight">Terms of Service</h1>
          <p className="text-slate-500 mb-12">Last updated: March 12, 2026</p>
          
          <div className="space-y-12 prose prose-slate max-w-none">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                By accessing or using Manuscale (the "Service"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Use License</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Permission is granted to use the Manuscale platform for personal or commercial publishing purposes. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>Attempt to decompile or reverse engineer any software contained on Manuscale's website;</li>
                <li>Remove any copyright or other proprietary notations from the materials;</li>
                <li>Use the service to generate content that violates any laws or third-party rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. User Conduct</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>Upload or generate content that is unlawful, harmful, threatening, abusive, or otherwise objectionable;</li>
                <li>Impersonate any person or entity or falsely state your affiliation with a person or entity;</li>
                <li>Interfere with or disrupt the Service or servers or networks connected to the Service;</li>
                <li>Violate any applicable local, state, national, or international law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Intellectual Property</h2>
              <p className="text-slate-600 leading-relaxed">
                You retain all ownership rights to the content you provide and the manuscripts generated through the Service. Manuscale does not claim any copyright over your generated books. You are solely responsible for ensuring that your content does not infringe upon the intellectual property rights of others.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. AI Services and Accuracy</h2>
              <p className="text-slate-600 leading-relaxed">
                Manuscale utilizes artificial intelligence to assist in research and drafting. While we strive for high fidelity, we do not guarantee the accuracy, completeness, or reliability of any information generated. Users are expected to fact-check and review all generated content before publication.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Subscription and Payments</h2>
              <p className="text-slate-600 leading-relaxed">
                Access to certain features may require a paid subscription or credits. All fees are non-refundable unless required by law. You may cancel your subscription at any time through your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">7. Disclaimer of Warranties</h2>
              <p className="text-slate-600 leading-relaxed">
                The materials on Manuscale's website are provided on an 'as is' basis. Manuscale makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-slate-600 leading-relaxed">
                In no event shall Manuscale or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Manuscale's website, even if Manuscale or a Manuscale authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">9. Termination</h2>
              <p className="text-slate-600 leading-relaxed">
                We may terminate or suspend your access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">10. Governing Law</h2>
              <p className="text-slate-600 leading-relaxed">
                These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which Manuscale operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
