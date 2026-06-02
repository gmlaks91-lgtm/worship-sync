import { LayeredProfileAvatar } from "@/components/profile/layered-profile-avatar";
import type { QtCommentRow } from "@/features/qt-share/queries/getQtFeedData";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type QtCommentCardProps = {
  comment: QtCommentRow;
  className?: string;
};

export function QtCommentCard({ comment, className }: QtCommentCardProps) {
  const hasQuote = Boolean(comment.quotedVerse.trim());

  return (
    <article
      className={cn(
        "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <LayeredProfileAvatar
          size="sm"
          avatarUrl={comment.authorAvatarUrl}
          fallbackLabel={comment.authorName}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{comment.authorName}</p>
          <p className="text-xs text-slate-400">{formatDateTime(comment.createdAt)}</p>
        </div>
      </div>

      {hasQuote ? (
        <blockquote className="mb-3 border-l-4 border-blue-400 bg-gray-50 p-2 text-sm leading-relaxed text-slate-700">
          {comment.quotedVerse}
        </blockquote>
      ) : null}

      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-800">
        {comment.content}
      </p>
    </article>
  );
}
