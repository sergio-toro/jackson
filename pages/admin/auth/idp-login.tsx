import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Page() {
  const router = useRouter();

  const { isReady, query } = router;

  useEffect(() => {
    if (!isReady) return;

    signIn('boxyhq-saml-idplogin', {
      code: query?.code,
      callbackUrl: '/',
    });
  }, [isReady, query?.code]);

  return null;
}
