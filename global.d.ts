declare module "next-pwa" {
  import type { NextConfig } from "next";
  function nextPWA(config: NextConfig): NextConfig;
  export default nextPWA;
}
