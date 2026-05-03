import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-primary-100 selection:text-primary-900">
      <PageHeader 
        title="Privacy Policy"
        breadcrumbs={[{ label: 'Privacy', href: '/privacy' }]}
      />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-[40px] p-12 shadow-sm border border-slate-100">
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-slate-500 mb-12">Last updated: May 3, 2026</p>
          
          <div className="space-y-12 prose prose-slate max-w-none">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We collect information that you provide directly to us when using Typoscale:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li><strong>Account Information:</strong> Name, email address, and authentication data (via Google or Email). This is stored securely in our cloud database.</li>
                <li><strong>Prompts and Requests:</strong> When you use AI features, your prompts are sent to Google's Gemini AI service to generate responses. These are not permanently stored on our servers.</li>
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
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>Account Information:</strong> Your account details (name, email, authentication data) are stored securely in our cloud database using industry-standard encryption and security protocols.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong>Book Projects:</strong> Your manuscripts, book drafts, and project data are stored exclusively on your local device (in your browser's local storage). These files are never uploaded to our cloud servers and remain under your complete control. You can export your projects at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Third-Party AI Services</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Typoscale utilizes Google's Gemini AI services to power its research and drafting capabilities. When you use AI features:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>Your prompts and selected content are sent to Google Gemini's servers to generate responses</li>
                <li>Google's AI services may process this data according to their own privacy policies</li>
                <li>This data is not stored on Typoscale's servers—only on your local device and transmitted to Google for processing</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-4">
                We do not sell your personal data to third parties. For more information about how Google processes your data, please review <a href="https://policies.google.com/privacy" className="text-primary-600 underline" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Your Rights and Choices</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                You have the right to access, update, or delete your personal information at any time.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li><strong>Account Data:</strong> You can update or delete your account information through your account settings. You can also request a complete deletion of your account by contacting our support team.</li>
                <li><strong>Project Data:</strong> Since your book projects are stored locally on your device, you have complete control over them. You can delete projects directly from the studio, and they will be removed from your device.</li>
                <li><strong>AI Requests:</strong> Data sent to Google Gemini is governed by Google's privacy policies. You may wish to review their data retention policies separately.</li>
              </ul>
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
