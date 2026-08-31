/** 项目导读：页面布局：统一导航、主题和内容骨架；架子搭稳了，里面的页面才不会各走各的。 */
import type { Metadata } from "next";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { FloatingAnnouncement } from "@/components/layout/FloatingAnnouncement";
import "./globals.css";

export const metadata: Metadata = {
  title: "文艺体育中心管理网站",
  description: "文艺体育中心志愿者、任务、资料和教程管理平台"
};

const themeBootstrapScript = `(function(){try{var p=localStorage.getItem('wenti-theme')||'system';if(p!=='light'&&p!=='dark'&&p!=='system')p='system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.themePreference=p;r.dataset.theme=d?'dark':'light';r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light'}catch(e){}})();`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head>
      <body>
        <SessionGuard />
        <FloatingAnnouncement />
        {children}
      </body>
    </html>
  );
}
