import { BadgeProps, Badge as BaseBadge } from 'react-daisyui';

const Badge = (props: BadgeProps) => {
  const { children, className } = props;

  return (
    <>
      <BaseBadge {...props} className={`rounded-md py-2 text-white ${className}`}>
        {children}
      </BaseBadge>
    </>
  );
};

export default Badge;
