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

// 部署后旧页面可能仍引用已经被新构建替换的 CSS。检测到 Next.js 样式表加载失败时，
// 绕过旧 HTML 缓存自动重载一次；时间锁可避免网络持续异常时反复刷新。
const assetRecoveryScript = `(function(){var k='wenti-asset-recovery-at',q='__asset_retry';function links(){return Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"][href*="/_next/static/"]'))}function recover(){try{var n=Date.now(),last=Number(sessionStorage.getItem(k)||0);if(n-last<30000)return;sessionStorage.setItem(k,String(n));var u=new URL(location.href);u.searchParams.set(q,String(n));location.replace(u.href)}catch(e){}}addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&t.href.indexOf('/_next/static/')!==-1)recover()},true);addEventListener('load',function(){var a=links();if(a.some(function(l){return !l.sheet})){recover();return}try{var u=new URL(location.href);if(u.searchParams.has(q)){u.searchParams.delete(q);history.replaceState(history.state,'',u.pathname+(u.search?'?'+u.searchParams.toString():'')+u.hash)}}catch(e){}},{once:true})})();`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <script dangerouslySetInnerHTML={{ __html: assetRecoveryScript }} />
      </head>
      <body>
        <SessionGuard />
        <FloatingAnnouncement />
        {children}
      </body>
    </html>
  );
}
