"use client";

import type { ModalKind } from "@/hooks/useErpContext";

import OtherModal from "./OtherModal";
import ProductModal from "./ProductModal";
import PurchaseModal from "./PurchaseModal";
import SaleModal from "./SaleModal";

/**
 * Renders whichever operation dialog the shell has open.
 *
 * The shell keys this element by kind and id, so switching operations mounts a
 * fresh form rather than reusing the previous one's state.
 */
export default function OperationModals({
  kind,
  transactionId = null,
  projectId,
  demo,
  onClose,
  onSaved,
}: {
  kind: ModalKind;
  transactionId?: number | null;
  projectId: number | null;
  demo: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const props = { transactionId, projectId, demo, onClose, onSaved };

  if (kind === "sale") return <SaleModal {...props} />;
  if (kind === "purchase") return <PurchaseModal {...props} />;
  if (kind === "other") return <OtherModal {...props} />;
  if (kind === "product") return <ProductModal projectId={projectId} demo={demo} onClose={onClose} onSaved={onSaved} />;
  return null;
}
