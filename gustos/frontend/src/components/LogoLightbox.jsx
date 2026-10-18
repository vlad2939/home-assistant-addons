import Modal from "./Modal.jsx";

// Logo mare, centrat, fără niciun text. Se închide la ESC sau click oriunde.
export default function LogoLightbox({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} bare closeOnContentClick title="Logo Gustos">
      <img
        src="/logo.webp"
        alt=""
        className="h-[min(82vh,82vw)] w-[min(82vh,82vw)] select-none rounded-[12%] drop-shadow-2xl"
        draggable={false}
      />
    </Modal>
  );
}
