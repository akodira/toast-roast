"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/* Homepage "Join Your Table" box. This doesn't duplicate the lookup logic —
   it hands the phone number to /portal, which owns the real join flow
   (find table → confirm who you are → order). Keeping one implementation
   means the security check stays in exactly one place. */
export default function JoinTableBox({ content }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  const go = () => {
    const p = phone.trim();
    router.push(p ? `/portal?join=${encodeURIComponent(p)}` : "/portal");
  };

  return (
    <div className="join-form">
      <h3>{content.join_title || "Join Your Table"}</h3>
      <div className="rule"><i /><span className="dot" /><i /></div>
      <p>{content.join_text || "Enter the host's phone number to find your table and start ordering."}</p>

      <div className="phone-row">
        <span className="cc">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="6" y="2" width="12" height="20" rx="2" /><path d="M12 18h.01" />
          </svg>
          +20
        </span>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()}
          placeholder="Enter host's phone number"
          aria-label="Host's phone number"
        />
      </div>

      <button className="btn" onClick={go}>
        Find My Table
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>

      <div className="join-help">Need help? Ask our staff.</div>
    </div>
  );
}
