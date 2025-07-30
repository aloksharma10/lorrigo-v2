"use client"

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function VideoContainer() {
  const pathname = usePathname();
  // const [isSignInPage, setIsSignInPage] = useState(false);

  const isSignInPage = pathname === '/auth/signin';
  console.log(pathname, isSignInPage);

  // useEffect(() => {
  //   setIsSignInPage(pathname === '/auth/signin');
  // }, [pathname]);

  return (
    <div className="bg-muted relative hidden lg:block">
      <video className="h-full w-full object-cover" autoPlay muted loop playsInline>
        <source src={isSignInPage ? "/signin-video.mp4" : "/signup-video.mp4"} type="video/mp4" />
      </video>
    </div>
  );
}