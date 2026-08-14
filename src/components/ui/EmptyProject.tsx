import { useT } from "@/i18n/LocaleProvider";

/** Shown by every view when no project is selected yet. */
export default function EmptyProject() {
  const { t } = useT();
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-12 text-center italic text-slate-500">
      {t("project.none")}
    </div>
  );
}
