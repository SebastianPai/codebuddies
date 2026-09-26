// Sin "use client": lo importa GoogleTagManager.tsx, que es de servidor.
export const CONSENT_STORAGE_KEY = "cb-consent";
export const CONSENT_VERSION = 1;

// Snippet que corre en el <head> ANTES de GTM/AdSense: todo denegado por
// defecto y, si ya hay una elección guardada, se aplica en el acto.
export const CONSENT_DEFAULT_SNIPPET = `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});
gtag('set','ads_data_redaction',true);
gtag('set','url_passthrough',true);
window.adsbygoogle=window.adsbygoogle||[];
window.adsbygoogle.requestNonPersonalizedAds=1;
try{var c=JSON.parse(localStorage.getItem('${CONSENT_STORAGE_KEY}')||'null');
if(c&&c.v===${CONSENT_VERSION}){var a=c.ads?'granted':'denied';
gtag('consent','update',{analytics_storage:c.analytics?'granted':'denied',ad_storage:a,ad_user_data:a,ad_personalization:a});
window.adsbygoogle.requestNonPersonalizedAds=c.ads?0:1;}}catch(e){}
`;
