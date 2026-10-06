import { Logo } from "./Icon";

// Plain-English privacy notice for monitorlab.co.uk. Keep in step with what the app actually does.
const UPDATED = "6 October 2026";
const CONTROLLER = "Monitor Lab";
const CONTACT = "hello@monitorlab.co.uk";

export function PrivacyPage() {
  return (
    <div className="doc-page">
      <header className="doc-top">
        <a className="brand" href="/">
          <Logo />
          <span>Monitor Lab</span>
        </a>
        <a className="text-button" href="/">Back to Monitor Lab</a>
      </header>
      <main className="doc">
        <h1>Privacy</h1>
        <p className="doc-meta">Last updated {UPDATED}</p>

        <p className="doc-lead">
          You can use Monitor Lab without an account, and without telling us anything about yourself. We only hold personal
          information if you choose to sign in to save monitors or setups.
        </p>

        <h2>Who we are</h2>
        <p>
          Monitor Lab (monitorlab.co.uk) is run by {CONTROLLER}, the data controller for the information described here.
          Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>

        <h2>If you don't sign in</h2>
        <p>We don't ask for or store any personal information. The setups you compare stay in your browser and are not sent to us.</p>
        <p>Your browser keeps one small item on your device: the actual-size calibration, if you use that feature. It never leaves your device.</p>

        <h2>If you sign in</h2>
        <p>We store:</p>
        <ul>
          <li><strong>Your email address</strong>, so we can send sign-in links. There are no passwords.</li>
          <li><strong>The monitors and setups you save</strong>, and when you saved them.</li>
          <li><strong>Basic sign-in records</strong> kept by our login provider, such as when you last signed in, to keep accounts secure.</li>
        </ul>
        <p>Your browser also keeps a sign-in token on your device, so you stay signed in until you sign out.</p>
        <p>
          We use this information only to run your account. Our legal basis is providing the service you asked for (contract).
          We don't send marketing emails, and we never sell or share your information.
        </p>

        <h2>No tracking</h2>
        <p>
          Monitor Lab has no analytics, advertising or tracking cookies. The only things stored on your device are the
          calibration and sign-in items above, which the site needs to work, so there's no cookie banner.
        </p>

        <h2>Who handles data for us</h2>
        <ul>
          <li><strong>Supabase</strong> stores the monitor catalogue, accounts and saved items, in London (UK).</li>
          <li><strong>Vercel</strong> hosts the website. Like any web host, it briefly logs visits (including IP addresses) to keep the service running and secure.</li>
          <li><strong>Resend</strong> sends sign-in emails, from the EU (Ireland).</li>
          <li><strong>Google Fonts</strong> supplies the typeface. Your browser fetches it from Google, which sees your IP address.</li>
        </ul>
        <p>
          Some of these companies are based in the US and may process data there. Where that happens they use the UK's approved
          safeguards for international transfers.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Until you delete your account. You can do that at any time from <strong>Saved → Delete my account</strong>, which
          immediately removes your email address, saved monitors and saved setups. Backups held by our providers are cleared
          on their normal cycle.
        </p>

        <h2>Your rights</h2>
        <p>
          Under UK data protection law you can ask to see, correct, export or delete your information, or object to how we use
          it. Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we'll reply within a month. If you're unhappy with how we
          handle your information, you can complain to the Information Commissioner's Office at{" "}
          <a href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>.
        </p>

        <h2>Changes</h2>
        <p>If we change what we collect, we'll update this page and the date at the top.</p>
      </main>
    </div>
  );
}
