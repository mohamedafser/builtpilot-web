"use client";

import { PhotoGallery } from "@/components/daily-reports/photo-gallery";
import {
  PhotoUploader,
  type PendingPhoto,
} from "@/components/daily-reports/photo-uploader";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MANPOWER_ROLE_LABELS,
  MANPOWER_ROLES,
  MATERIAL_TYPE_LABELS,
  MATERIAL_TYPES,
  MATERIAL_UNITS,
  WEATHER_LABELS,
  WEATHER_VALUES,
  emptyManpowerCounts,
  isWeather,
  totalManpower,
} from "@/constants/daily-report";
import {
  MATERIAL_UNIT_PLURAL_LABELS,
  MATERIAL_UNIT_SHORT_LABELS,
} from "@/constants/material";
import { requestFormData, requestJson } from "@/lib/api/client";
import type { DailyReportDetail } from "@/lib/daily-reports/types";
import { showToast } from "@/lib/toast";
import {
  dailyReportSchema,
  parseManpowerCounts,
  todayIsoDate,
  type DailyReportFormValues,
} from "@/lib/validations/daily-report";
import type { Material, Project } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { WithIcon } from "@/components/ui/with-icon";
import { Plus, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

type DailyReportFormProps = {
  project: Project;
  detail?: DailyReportDetail;
};

const fieldClass = "h-12 text-base";
const textareaClass = "min-h-28 text-base";

function defaultValues(detail?: DailyReportDetail): DailyReportFormValues {
  const counts = detail?.manpower_counts ?? emptyManpowerCounts();

  return {
    report_date: detail?.report.report_date ?? todayIsoDate(),
    weather:
      detail?.report.weather && isWeather(detail.report.weather)
        ? detail.report.weather
        : "",
    work_completed: detail?.report.work_completed ?? "",
    issues: detail?.report.issues ?? "",
    tomorrow_plan: detail?.report.tomorrow_plan ?? "",
    general_notes: detail?.report.general_notes ?? "",
    manpower: {
      mason: counts.mason ? String(counts.mason) : "",
      helper: counts.helper ? String(counts.helper) : "",
      carpenter: counts.carpenter ? String(counts.carpenter) : "",
      electrician: counts.electrician ? String(counts.electrician) : "",
      plumber: counts.plumber ? String(counts.plumber) : "",
      other: counts.other ? String(counts.other) : "",
    },
    materials:
      detail?.materials.map((material) => ({
        material_name: material.material_name,
        quantity: String(material.quantity),
        unit: material.unit,
        type: material.type,
      })) ?? [],
  };
}

export function DailyReportForm({ project, detail }: DailyReportFormProps) {
  const isEdit = Boolean(detail);
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [existingPhotos, setExistingPhotos] = useState(detail?.photos ?? []);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const initialPhotoIds = useMemo(
    () => new Set((detail?.photos ?? []).map((photo) => photo.id)),
    [detail?.photos],
  );
  const photosChanged =
    pendingPhotos.length > 0 ||
    existingPhotos.length !== initialPhotoIds.size ||
    existingPhotos.some((photo) => !initialPhotoIds.has(photo.id));

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DailyReportFormValues>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: defaultValues(detail),
  });

  const materials = useFieldArray({
    control,
    name: "materials",
  });
  const [catalog, setCatalog] = useState<Material[]>([]);

  const manpowerValues = watch("manpower");
  const watchedMaterials = watch("materials");

  useEffect(() => {
    let cancelled = false;

    void requestJson<{ materials: Material[] }>("/api/materials/active").then(
      (result) => {
        if (cancelled || !result.ok) {
          return;
        }

        setCatalog(result.data.materials);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  function selectedMaterialValue(name: string) {
    const match = catalog.find((material) => material.name === name);
    if (match) {
      return match.id;
    }

    return name ? `saved:${name}` : "";
  }

  function onMaterialChange(index: number, materialId: string) {
    if (!materialId) {
      setValue(`materials.${index}.material_name`, "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(`materials.${index}.unit`, "", { shouldDirty: true });
      return;
    }

    if (materialId.startsWith("saved:")) {
      setValue(`materials.${index}.material_name`, materialId.slice(6), {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    const material = catalog.find((item) => item.id === materialId);

    if (!material) {
      return;
    }

    setValue(`materials.${index}.material_name`, material.name, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(
      `materials.${index}.unit`,
      MATERIAL_UNIT_PLURAL_LABELS[material.unit],
      { shouldDirty: true, shouldValidate: true },
    );
  }

  const workerTotal = useMemo(
    () => totalManpower(parseManpowerCounts(manpowerValues)),
    [manpowerValues],
  );

  async function uploadPhotos(reportId: string): Promise<string | null> {
    for (let index = 0; index < pendingPhotos.length; index += 1) {
      const photo = pendingPhotos[index];
      setUploadProgress(
        `Uploading photo ${index + 1} of ${pendingPhotos.length}...`,
      );

      const formData = new FormData();
      formData.append("file", photo.file, photo.file.name);
      formData.append("caption", photo.caption);

      const result = await requestFormData<{ photo: { id: string } }>(
        `/api/projects/${project.id}/reports/${reportId}/photos`,
        formData,
        { notify: false },
      );

      if (!result.ok) {
        return result.message;
      }
    }

    setUploadProgress(null);
    return null;
  }

  async function onSubmit(values: DailyReportFormValues) {
    setFormError(null);
    setUploadProgress(isEdit ? "Saving report..." : "Creating report...");

    const result = detail
      ? await requestJson<{ id: string }>(
          `/api/projects/${project.id}/reports/${detail.report.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(values),
          },
        )
      : await requestJson<{ id: string }>(
          `/api/projects/${project.id}/reports`,
          {
            method: "POST",
            body: JSON.stringify(values),
          },
        );

    if (!result.ok) {
      setUploadProgress(null);
      setFormError(result.message);
      return;
    }

    const reportId = result.data.id;
    const photoError = await uploadPhotos(reportId);

    if (photoError) {
      setUploadProgress(null);
      setFormError(
        `The report was saved, but a photo failed to upload: ${photoError}`,
      );
      showToast("Report saved, but a photo failed to upload.", "error");
      router.push(`/projects/${project.id}/reports/${reportId}/edit`);
      router.refresh();
      return;
    }

    showToast(
      isEdit ? "Daily report updated." : "Daily report created.",
      "success",
    );
    router.push(`/projects/${project.id}/reports/${reportId}`);
    router.refresh();
  }

  const cancelHref = detail
    ? `/projects/${project.id}/reports/${detail.report.id}`
    : `/projects/${project.id}/reports`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formError ? <Alert variant="error">{formError}</Alert> : null}
      {uploadProgress ? <Alert variant="info">{uploadProgress}</Alert> : null}

      <section className="space-y-4">
        <h3 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
          Site conditions
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="report_date">
              Report date <span className="text-red-600">*</span>
            </Label>
            <Input
              id="report_date"
              type="date"
              max={todayIsoDate()}
              min={project.start_date ?? undefined}
              className={fieldClass}
              error={Boolean(errors.report_date)}
              {...register("report_date")}
            />
            {errors.report_date ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.report_date.message}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="weather">Weather</Label>
            <Select
              id="weather"
              className={fieldClass}
              error={Boolean(errors.weather)}
              {...register("weather")}
            >
              <option value="">Not recorded</option>
              {WEATHER_VALUES.map((value) => (
                <option key={value} value={value}>
                  {WEATHER_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section>
        <Label htmlFor="work_completed">
          Work completed <span className="text-red-600">*</span>
        </Label>
        <Textarea
          id="work_completed"
          rows={5}
          className={textareaClass}
          placeholder="What did the crew complete today?"
          error={Boolean(errors.work_completed)}
          {...register("work_completed")}
        />
        {errors.work_completed ? (
          <p className="mt-1 text-sm text-red-600">
            {errors.work_completed.message}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
              Manpower
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Optional crew breakdown. Total updates automatically.
            </p>
          </div>
          <p className="text-sm font-semibold text-stone-800">
            {workerTotal} {workerTotal === 1 ? "worker" : "workers"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MANPOWER_ROLES.map((role) => (
            <div key={role}>
              <Label htmlFor={`manpower.${role}`}>
                {MANPOWER_ROLE_LABELS[role]}
              </Label>
              <Input
                id={`manpower.${role}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className={fieldClass}
                error={Boolean(errors.manpower?.[role])}
                {...register(`manpower.${role}`)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
              Materials
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Choose from your material catalog. Record what was received or
              used today.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              materials.append({
                material_name: "",
                quantity: "",
                unit: "",
                type: "received",
              })
            }
            icon={Plus}
          >
            Add material
          </Button>
        </div>

        {catalog.length === 0 ? (
          <p className="text-sm text-stone-500">
            No catalog materials yet.{" "}
            <Link href="/materials/new" className="font-medium text-amber-800">
              Add a material
            </Link>{" "}
            first, then it will appear here.
          </p>
        ) : null}

        {materials.fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 px-3 py-4 text-sm text-stone-500">
            No materials added.
          </p>
        ) : (
          <div className="space-y-3">
            {materials.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-xl border border-stone-200 p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-4">
                  <Label htmlFor={`materials.${index}.material_name`}>
                    Material
                  </Label>
                  <Select
                    id={`materials.${index}.material_name`}
                    className={fieldClass}
                    error={Boolean(errors.materials?.[index]?.material_name)}
                    value={selectedMaterialValue(
                      watchedMaterials?.[index]?.material_name ?? "",
                    )}
                    onChange={(event) =>
                      onMaterialChange(index, event.target.value)
                    }
                  >
                    <option value="">Select material</option>
                    {catalog.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} (
                        {MATERIAL_UNIT_SHORT_LABELS[material.unit]})
                      </option>
                    ))}
                    {watchedMaterials?.[index]?.material_name &&
                    !catalog.some(
                      (material) =>
                        material.name ===
                        watchedMaterials[index]?.material_name,
                    ) ? (
                      <option
                        value={`saved:${watchedMaterials[index].material_name}`}
                      >
                        {watchedMaterials[index].material_name}
                      </option>
                    ) : null}
                  </Select>
                  {errors.materials?.[index]?.material_name ? (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.materials[index]?.material_name?.message}
                    </p>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`materials.${index}.quantity`}>Qty</Label>
                  <Input
                    id={`materials.${index}.quantity`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    className={fieldClass}
                    error={Boolean(errors.materials?.[index]?.quantity)}
                    {...register(`materials.${index}.quantity`)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`materials.${index}.unit`}>Unit</Label>
                  <Input
                    id={`materials.${index}.unit`}
                    className={fieldClass}
                    list="material-units"
                    error={Boolean(errors.materials?.[index]?.unit)}
                    {...register(`materials.${index}.unit`)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label htmlFor={`materials.${index}.type`}>Type</Label>
                  <Select
                    id={`materials.${index}.type`}
                    className={fieldClass}
                    {...register(`materials.${index}.type`)}
                  >
                    {MATERIAL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {MATERIAL_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12 w-full text-red-700"
                    onClick={() => materials.remove(index)}
                    icon={Trash2}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <datalist id="material-units">
          {MATERIAL_UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
      </section>

      <section>
        <Label htmlFor="issues">Site issues</Label>
        <Textarea
          id="issues"
          rows={4}
          className={textareaClass}
          placeholder="Delays, shortages, safety notes..."
          {...register("issues")}
        />
      </section>

      <section>
        <Label htmlFor="tomorrow_plan">Tomorrow&apos;s plan</Label>
        <Textarea
          id="tomorrow_plan"
          rows={4}
          className={textareaClass}
          placeholder="What should the crew start with tomorrow?"
          {...register("tomorrow_plan")}
        />
      </section>

      <section>
        <Label htmlFor="general_notes">General notes</Label>
        <Textarea
          id="general_notes"
          rows={3}
          className={textareaClass}
          {...register("general_notes")}
        />
      </section>

      {isEdit ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">
            Existing photos
          </h3>
          <PhotoGallery
            projectId={project.id}
            reportId={detail?.report.id ?? ""}
            photos={existingPhotos}
            onDeleted={(photoId) =>
              setExistingPhotos((current) =>
                current.filter((photo) => photo.id !== photoId),
              )
            }
          />
        </section>
      ) : null}

      <PhotoUploader
        photos={pendingPhotos}
        onChange={setPendingPhotos}
        disabled={isSubmitting}
      />

      <div className="sticky bottom-0 z-10 -mx-5 border-t border-stone-200 bg-white/95 p-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={cancelHref}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-base font-medium text-stone-800 hover:bg-stone-50 sm:h-11 sm:text-sm"
          >
            <WithIcon icon={X}>Cancel</WithIcon>
          </Link>
          <Button
            type="submit"
            disabled={
              isSubmitting || (isEdit && !isDirty && !photosChanged)
            }
            className="h-12 sm:h-11"
            icon={Save}
          >
            {isSubmitting
              ? "Saving..."
              : isEdit
                ? "Save report"
                : "Save daily report"}
          </Button>
        </div>
      </div>
    </form>
  );
}
