import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-primary-100 selection:text-primary-900">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors mb-12 uppercase tracking-widest">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-[40px] p-12 shadow-sm border border-slate-100">
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-slate-500 mb-12">Last updated: March 12, 2026</p>
          
          <div className="space-y-12 prose prose-slate max-w-none">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We collect information that you provide directly to us when using Typoscale:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li><strong>Account Information:</strong> Name, email address, and authentication data (via Google or Email).</li>
                <li><strong>Content Data:</strong> Manuscripts, book topics, outlines, and prompts you provide to the AI.</li>
                <li><strong>Usage Data:</strong> Information about how you interact with our studio and features.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>To provide, maintain, and improve the Typoscale studio;</li>
                <li>To process AI requests and generate manuscript content;</li>
                <li>To communicate with you about your account and updates;</li>
                <li>To ensure the security and integrity of our platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Data Storage and Security</h2>
              <p className="text-slate-600 leading-relaxed">
                Your manuscripts and project data are stored securely. We utilize industry-standard encryption and security protocols to protect your intellectual property. While we take significant measures to protect your data, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Third-Party AI Services</h2>
              <p className="text-slate-600 leading-relaxed">
                Typoscale utilizes Google's Gemini AI services to power its research and drafting capabilities. When you use these features, relevant parts of your prompts and content are shared with Google to generate responses. We do not sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Your Rights and Choices</h2>
              <p className="text-slate-600 leading-relaxed">
                You have the right to access, update, or delete your personal information at any time. You can manage your project data directly within the studio. If you wish to delete your account entirely, please contact our support team.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Cookies and Tracking</h2>
              <p className="text-slate-600 leading-relaxed">
                We use essential cookies to maintain your session and provide a personalized experience. You can control cookie settings through your browser, but disabling them may limit your ability to use certain features of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">7. International Data Transfers</h2>
              <p className="text-slate-600 leading-relaxed">
                Your information, including Personal Data, may be transferred to — and maintained on — computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction. Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">8. Children's Privacy</h2>
              <p className="text-slate-600 leading-relaxed">
                Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware that your child has provided us with Personal Data, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">9. Changes to This Policy</h2>
              <p className="text-slate-600 leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">10. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                If you have any questions about this Privacy Policy, you can contact us at support@typoscale.com.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
