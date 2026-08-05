import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { talentAPI } from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "../components/ui/breadcrumb";
import {
  Loader2, GitMerge, Users, CheckCircle2, XCircle, Clock, AlertTriangle,
} from "lucide-react";

/**
 * Pairs the matcher could not decide on.
 *
 * Identity resolution merges only on strong evidence; anything suggestive but
 * inconclusive lands here rather than being guessed at, because merging two
 * different people loses a candidate and is not easily undone.
 */

const FIELDS = [
  ["email", "Email"],
  ["phone", "Phone"],
  ["linkedin", "LinkedIn"],
  ["created_at", "Added"],
];

const short = (v) => {
  if (!v) return null;
  const s = String(v);
  return s.length > 34 ? `${s.slice(0, 32)}…` : s;
};

/** Highlights where two records disagree — that is what a reviewer is judging. */
const CandidateCard = ({ candidate, other, selected, onSelect, label }) => {
  if (!candidate) {
    return (
      <div className="flex-1 p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">This record no longer exists</p>
      </div>
    );
  }
  const skills = candidate.skills || [];

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`candidate-${label}`}
      className={`flex-1 text-left p-4 rounded-xl border transition-all ${
        selected
          ? "border-[#1B4332] bg-[#1B4332]/[0.04] ring-1 ring-[#1B4332]"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          Candidate {label}
        </span>
        {selected && (
          <span className="text-[10px] font-semibold text-[#1B4332] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> keep this one
          </span>
        )}
      </div>

      <p className="font-semibold text-gray-900 text-sm mb-2 break-words">
        {candidate.name || <span className="text-gray-400 italic">no name parsed</span>}
      </p>

      <div className="space-y-1">
        {FIELDS.map(([key, labelText]) => {
          const mine = candidate[key];
          const theirs = other?.[key];
          const differs = mine && theirs && String(mine) !== String(theirs);
          if (!mine) return null;
          return (
            <p key={key} className="text-xs flex gap-1.5">
              <span className="text-gray-400 w-14 shrink-0">{labelText}</span>
              <span className={differs ? "text-amber-700 font-medium" : "text-gray-600"}>
                {short(key === "created_at" ? String(mine).slice(0, 10) : mine)}
              </span>
            </p>
          );
        })}
      </div>

      {skills.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {skills.length} skill{skills.length === 1 ? "" : "s"} · {(candidate.education || []).length} qualification(s)
        </p>
      )}
    </button>
  );
};

export default function MergeReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [keepChoice, setKeepChoice] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await talentAPI.listMergeReviews();
      setReviews(data.reviews || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not load reviews");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const decide = async (review, decision) => {
    setBusy(review.review_id);
    try {
      const res = await talentAPI.resolveMergeReview(review.review_id, {
        decision,
        keep: decision === "merge" ? keepChoice[review.review_id] : undefined,
      });
      if (decision === "merge") {
        toast.success(`Merged — ${res.versions_moved || 0} resume version(s) moved across`);
      } else if (decision === "separate") {
        toast.success("Kept separate — this pair will not be raised again");
      } else {
        toast.info("Deferred");
      }
      setReviews((rs) => rs.filter((r) => r.review_id !== review.review_id));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save that decision");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-6" data-testid="merge-reviews-page">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/talent" className="text-gray-500 hover:text-gray-900">Talent</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-300" />
          <BreadcrumbItem><BreadcrumbPage className="text-gray-900 font-medium">Duplicate Review</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Duplicate Review</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Pairs that look like the same person but were not certain enough to merge automatically.
          Differing values are highlighted.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-900 font-medium">Nothing waiting</p>
          <p className="text-sm text-gray-500 mt-1">
            Possible duplicates appear here as CVs are imported.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const a = review.candidate_a_detail;
            const b = review.candidate_b_detail;
            const chosen = keepChoice[review.review_id];
            const pct = Math.round((review.score || 0) * 100);

            return (
              <div key={review.review_id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm" data-testid="merge-review-card">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-900">{pct}% likely the same person</span>
                    <span className="text-xs text-gray-500">
                      — {(review.reasons || []).join(", ") || "no stated reason"}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">{String(review.created_at || "").slice(0, 10)}</span>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-stretch">
                  <CandidateCard
                    candidate={a} other={b} label="A"
                    selected={chosen === review.candidate_a}
                    onSelect={() => setKeepChoice({ ...keepChoice, [review.review_id]: review.candidate_a })}
                  />
                  <div className="flex items-center justify-center px-1">
                    <GitMerge className="w-4 h-4 text-gray-300" />
                  </div>
                  <CandidateCard
                    candidate={b} other={a} label="B"
                    selected={chosen === review.candidate_b}
                    onSelect={() => setKeepChoice({ ...keepChoice, [review.review_id]: review.candidate_b })}
                  />
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 flex-wrap gap-2">
                  <p className="text-xs text-gray-500">
                    {chosen
                      ? "The other record will be folded into the one you selected."
                      : "Select which record to keep, or merge and the fuller one is kept."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm" variant="ghost" disabled={busy === review.review_id}
                      onClick={() => decide(review, "later")} data-testid="decide-later"
                      className="text-gray-500"
                    >
                      <Clock className="w-3.5 h-3.5 mr-1.5" /> Later
                    </Button>
                    <Button
                      size="sm" variant="outline" disabled={busy === review.review_id}
                      onClick={() => decide(review, "separate")} data-testid="decide-separate"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Different people
                    </Button>
                    <Button
                      size="sm" disabled={busy === review.review_id}
                      onClick={() => decide(review, "merge")} data-testid="decide-merge"
                      className="bg-[#1B4332] hover:bg-[#1B4332]/90 text-white"
                    >
                      {busy === review.review_id
                        ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        : <GitMerge className="w-3.5 h-3.5 mr-1.5" />}
                      Merge
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
