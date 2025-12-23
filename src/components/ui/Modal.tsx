import React, { ReactNode } from 'react';
import styles from './Modal.module.css';
import { Card } from './Card';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose}></div>
      <Card className={styles.modal} title={title}>
        <div className={styles.content}>
          {children}
        </div>
        {(footer || onClose) && (
           <div className={styles.footer}>
             {footer}
             {!footer && onClose && <Button onClick={onClose}>Close</Button>}
           </div>
        )}
      </Card>
    </div>
  );
};
