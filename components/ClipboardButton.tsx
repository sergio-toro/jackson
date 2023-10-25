import { successToast } from '@components/Toaster';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import { copyToClipboard } from '@lib/ui/utils';
import { useTranslation } from 'next-i18next';
import { IconButton } from './IconButton';

export const CopyToClipboardButton = ({ text }: { text: string }) => {
  const { t } = useTranslation('common');

  return (
    <IconButton
      tooltip={t('copy')}
      Icon={ClipboardDocumentIcon}
      className='hover:text-primary'
      onClick={() => {
        copyToClipboard(text);
        successToast(t('copied'));
      }}
    />
  );
};

export const InputWithCopyButton = ({ text, label }: { text: string; label: string }) => {
  return (
    <>
      <div className='flex justify-between'>
        <label className='mb-2 block text-sm font-medium text-gray-900 dark:text-gray-300'>{label}</label>
        <CopyToClipboardButton text={text} />
      </div>
      <input
        type='text'
        defaultValue={text}
        key={text}
        readOnly
        className='input-bordered input w-full text-sm'
      />
    </>
  );
};
