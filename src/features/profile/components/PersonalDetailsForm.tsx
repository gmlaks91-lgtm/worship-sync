"use client";

import { Cake, Heart, Loader2, Music2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updatePersonalProfile } from "@/features/profile/actions/personalProfileActions";
import type { MyProfileRow } from "@/features/profile/queries/getMyProfile";
import { MBTI_OPTIONS } from "@/features/profile/lib/mbti-options";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  if (YMD.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type PersonalDetailsFormProps = {
  profile: MyProfileRow;
};

export function PersonalDetailsForm({ profile }: PersonalDetailsFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [birthday, setBirthday] = useState(() => toDateInputValue(profile.birthday));
  const [mbti, setMbti] = useState(() => profile.mbti ?? "");
  const [favoriteSong, setFavoriteSong] = useState(() => profile.favorite_song ?? "");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updatePersonalProfile({
        birthday: birthday.trim() || null,
        mbti: mbti.trim() || null,
        favorite_song: favoriteSong.trim() || null,
      });
      if (!res.ok) {
        toastError(res.message);
        return;
      }
      toastSuccess("프로필을 저장했습니다.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-lg flex-col gap-10">
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">내 프로필</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">나를 소개해요</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          생일·MBTI·좋아하는 곡을 적어 두면 프로필에 표시돼요. 언제든지 다시 수정할 수 있어요.
        </p>
      </div>

      <div className="space-y-8 rounded-2xl border border-border/70 bg-card px-6 py-8 sm:px-8">
        <div className="space-y-3">
          <Label htmlFor="birthday" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Cake className="size-4 text-primary" aria-hidden />
            생일
          </Label>
          <Input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            disabled={pending}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">비워 두면 프로필에 &apos;미입력&apos;으로 표시돼요.</p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="mbti" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Heart className="size-4 text-primary" aria-hidden />
            MBTI
          </Label>
          <Input
            id="mbti"
            list="mbti-suggestions"
            value={mbti}
            onChange={(e) => setMbti(e.target.value)}
            placeholder="예: ENFP"
            maxLength={16}
            disabled={pending}
            className="h-11 font-medium tracking-wide placeholder:font-normal placeholder:tracking-normal"
          />
          <datalist id="mbti-suggestions">
            {MBTI_OPTIONS.filter(Boolean).map((code) => (
              <option key={code} value={code} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">목록에서 고르거나 직접 입력해도 돼요.</p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="favorite-song" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Music2 className="size-4 text-primary" aria-hidden />
            가장 좋아하는 곡
          </Label>
          <Input
            id="favorite-song"
            value={favoriteSong}
            onChange={(e) => setFavoriteSong(e.target.value)}
            placeholder="찬양, CCM, 세속 곡 모두 좋아요"
            maxLength={200}
            disabled={pending}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">한 줄로 적어 주세요.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button type="submit" size="lg" className="min-h-11 sm:min-w-[8rem]" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "저장하기"}
        </Button>
        <Link
          href="/more"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "inline-flex min-h-11 items-center justify-center")}
        >
          마이페이지로
        </Link>
      </div>
    </form>
  );
}
