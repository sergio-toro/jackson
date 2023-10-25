import { ButtonPrimary } from '@components/ButtonPrimary';
import { useRouter } from 'next/router';

const NextButton = () => {
  const router = useRouter();

  const onClick = () => {
    const { idp, step, token } = router.query as { idp: string; step: string; token: string };

    router.push({
      pathname: router.pathname,
      query: {
        idp,
        step: parseInt(step) + 1,
        token,
      },
    });
  };

  return (
    <div>
      <ButtonPrimary onClick={onClick}>Next Step</ButtonPrimary>
    </div>
  );
};

export default NextButton;
