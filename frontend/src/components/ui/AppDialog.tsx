import * as Dialog from '@radix-ui/react-dialog';
import { ReactNode } from 'react';

interface Props {
  onClose: () => void;
  children: ReactNode;
}

export default function AppDialog({ onClose, children }: Props) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] modal-backdrop" />
        <Dialog.Content
          className="fixed inset-0 z-[71] flex items-center justify-center p-4 outline-none"
          aria-describedby={undefined}
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

