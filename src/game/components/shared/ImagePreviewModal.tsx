"use client";

import Modal from "./Modal";
import styles from "./ImagePreviewModal.module.css";

interface Props {
  title: string;
  imageUrl: string;
  onClose: () => void;
}

// Preview grande de una imagen de item/textura/sala: el thumbnail en la
// tarjeta suele ser demasiado chico para ver bien el objeto (más aún si es
// una textura no cuadrada), así que esto la muestra a tamaño completo.
export default function ImagePreviewModal({ title, imageUrl, onClose }: Props) {
  return (
    <Modal title={title} onClose={onClose} style={{ width: "min(440px, 92vw)" }}>
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} className={styles.image} />
      </div>
    </Modal>
  );
}
