import { useEffect, useState } from "react";

/** 브라우저에 마운트된 뒤에만 true — dnd-kit 등 SSR/CSR DOM 불일치 방지용 */
export function useIsClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
