"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deletePost } from "@/features/board/actions";
import { toastPromise } from "@/lib/app-toast";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type PostActionsProps = {
  postId: string;
  onEdit: () => void;
};

export function PostActions({ postId, onEdit }: PostActionsProps) {
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (
      !window.confirm("이 글을 삭제할까요? 이 글에 달린 댓글도 함께 삭제됩니다.")
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await toastPromise(
          deletePost(postId).then((res) => {
            if (!res.ok) throw new Error(res.message);
          }),
          "삭제하는 중이에요…",
        ).unwrap();
      } catch {
        /* toastPromise가 오류 토스트 처리 */
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        disabled={pending}
        aria-label="글 메뉴"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "shrink-0 text-muted-foreground hover:text-foreground",
        )}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        <DropdownMenuItem
          onClick={() => onEdit()}
          className="gap-2"
        >
          <Pencil className="size-4" aria-hidden />
          수정
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete} className="gap-2">
          <Trash2 className="size-4" aria-hidden />
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
