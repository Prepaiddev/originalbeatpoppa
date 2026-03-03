"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Script from 'next/script';

export default function HeadSettings() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'seo_settings')
        .single();
      
      if (data?.value) {
        setSettings(data.value);
      }
    }
    fetchSettings();
  }, []);

  if (!settings) return null;

  return (
    <>
      {/* Meta Tags are handled in layout.tsx via generateMetadata for SEO */}
      {/* This component handles scripts that need to be injected */}
      
      {settings.google_analytics_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${settings.google_analytics_id}');
            `}
          </Script>
        </>
      )}

      {settings.facebook_pixel_id && (
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${settings.facebook_pixel_id}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {settings.header_scripts && (
        <div dangerouslySetInnerHTML={{ __html: settings.header_scripts }} />
      )}
    </>
  );
}
