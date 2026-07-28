"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Public branch switcher shown in the site header. Changing it reloads the
// current page with ?branch=<id> so the menu / popular items follow the choice.
// Only renders when there's more than one active branch.
export default function BranchSwitcher({ branches = [], current }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  if (!branches || branches.length < 2) return null;

  const onChange = (e) => {
    const id = e.target.value;
    const qs = new URLSearchParams(params.toString());
    qs.set("branch", id);
    router.push(`${pathname}?${qs.toString()}`);
  };

  return (
    <label className="hdr-branch">
      <span className="hdr-branch-label">Branch</span>
      <select value={current ?? ""} onChange={onChange} aria-label="Choose branch">
        {branches.map(b => (
          <option key={b.BranchId} value={b.BranchId}>{b.Name}</option>
        ))}
      </select>
    </label>
  );
}
