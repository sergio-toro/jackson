import { useTranslation } from 'next-i18next';
import { ButtonBase } from './ButtonBase';
import { ButtonDanger } from './ButtonDanger';
import { ButtonOutline } from './ButtonOutline';
import Modal from './Modal';

interface Props {
  visible: boolean;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  actionButtonText?: string;
  overrideDeleteButton?: boolean;
  dataTestId?: string;
}

const ConfirmationModal = (props: Props) => {
  const {
    visible,
    title,
    description,
    onConfirm,
    onCancel,
    actionButtonText,
    dataTestId = 'confirm-delete',
    overrideDeleteButton = false,
  } = props;

  const { t } = useTranslation('common');

  const buttonText = actionButtonText || t('delete');

  return (
    <Modal visible={visible} title={title} description={description}>
      <div className='modal-action'>
        <ButtonOutline onClick={onCancel}>{t('cancel')}</ButtonOutline>
        {overrideDeleteButton ? (
          <ButtonBase color='secondary' onClick={onConfirm} data-testid={dataTestId}>
            {buttonText}
          </ButtonBase>
        ) : (
          <ButtonDanger onClick={onConfirm} data-testid={dataTestId}>
            {buttonText}
          </ButtonDanger>
        )}
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
