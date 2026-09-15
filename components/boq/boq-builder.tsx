"use client";

import { BoqItemForm } from "@/components/boq/boq-item-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { formatCompletionPercent } from "@/lib/boq/calculations";
import type {
  BoqDetail,
  BoqItemProgress,
  BoqSectionSummary,
} from "@/lib/boq/types";
import { formatLabourCost } from "@/lib/labour/money";
import {
  createBoqSectionFormSchema,
  type CreateBoqItemFormInput,
} from "@/lib/validations/boq";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { generateBoqItemCode } from "@/lib/boq/calculations";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import type { z } from "zod";

type SectionFormValues = z.infer<typeof createBoqSectionFormSchema>;

export function BoqBuilder({
  projectId,
  boq,
  onChanged,
}: {
  projectId: string;
  boq: BoqDetail;
  onChanged?: () => void;
}) {
  const submitLockRef = useRef(false);
  const [localBoq, setLocalBoq] = useState(boq);
  const [editingItem, setEditingItem] = useState<BoqItemProgress | null>(null);
  const [addingToSection, setAddingToSection] = useState<string | null>(null);
  const [renamingSection, setRenamingSection] =
    useState<BoqSectionSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoqItemProgress | null>(
    null,
  );
  const [sectionDeleteTarget, setSectionDeleteTarget] =
    useState<BoqSectionSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingSection, setIsDeletingSection] = useState(false);
  const addSection = useDisclosure();

  useEffect(() => {
    setLocalBoq(boq);
  }, [boq]);

  const allItems = useMemo(
    () =>
      [...localBoq.items, ...localBoq.unsectioned_items].sort(
        (left, right) => left.sort_order - right.sort_order,
      ),
    [localBoq.items, localBoq.unsectioned_items],
  );

  function itemsForSection(sectionId: string | null) {
    return allItems.filter(
      (item) => (item.section_id ?? "") === (sectionId ?? ""),
    );
  }

  async function refresh() {
    onChanged?.();
  }

  function updateItemLists(updater: (current: BoqDetail) => BoqDetail) {
    setLocalBoq((current) => updater({ ...current }));
  }

  function resolveNextItemCode(values: CreateBoqItemFormInput): string {
    const trimmed = values.item_code?.trim();

    if (trimmed && trimmed.length > 0) {
      return trimmed;
    }

    const sectionName =
      values.section_id && values.section_id !== ""
        ? (localBoq.sections.find((section) => section.id === values.section_id)
            ?.name ?? "General")
        : "General";

    const existingCodes = [...localBoq.items, ...localBoq.unsectioned_items]
      .filter((row) => row.id !== editingItem?.id)
      .filter((row) => (row.section_id ?? null) === (values.section_id || null))
      .map((row) => row.item_code)
      .filter((code): code is string => Boolean(code));

    return generateBoqItemCode(sectionName, existingCodes);
  }

  async function saveItem(values: CreateBoqItemFormInput) {
    if (submitLockRef.current) {
      return;
    }

    const payload = {
      ...values,
      item_code: resolveNextItemCode(values),
    };

    submitLockRef.current = true;

    try {
      const url = editingItem
        ? `/api/projects/${projectId}/boq/${boq.id}/items/${editingItem.id}`
        : `/api/projects/${projectId}/boq/${boq.id}/items`;
      const result = await requestJson<{ id: string }>(url, {
        method: editingItem ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      if (!result.ok) {
        return;
      }

      setEditingItem(null);
      setAddingToSection(null);

      updateItemLists((current) => {
        const target = editingItem
          ? { ...editingItem, ...payload }
          : ({
              ...(current.items.find((row) => row.id === result.data.id) ??
                current.unsectioned_items.find(
                  (row) => row.id === result.data.id,
                ) ??
                {}),
              ...payload,
              id: result.data.id,
              section_id: payload.section_id || null,
              /* keep server-side fields stable when the list item is newly created */
              estimated_amount: payload.estimated_quantity,
              sort_order: 0,
              section_name: null,
              remaining_quantity: payload.estimated_quantity,
              completed_value: "0.00",
              remaining_value: payload.estimated_quantity,
              completion_percentage: null,
              completion_status: "not_started",
              material_name: null,
            } as BoqItemProgress);

        const nextItems = editingItem
          ? current.items.map((row) =>
              row.id === editingItem.id ? target : row,
            )
          : [...current.items, target];

        const nextUnsectioned = current.unsectioned_items.filter(
          (row) => row.id !== (editingItem?.id ?? result.data.id),
        );

        return {
          ...current,
          items:
            payload.section_id && payload.section_id !== ""
              ? nextItems
              : current.items.filter(
                  (row) => row.id !== (editingItem?.id ?? result.data.id),
                ),
          unsectioned_items:
            payload.section_id && payload.section_id !== ""
              ? nextUnsectioned
              : [
                  ...current.unsectioned_items.filter(
                    (row) => row.id !== (editingItem?.id ?? result.data.id),
                  ),
                  target,
                ],
        };
      });
    } finally {
      submitLockRef.current = false;
    }
  }

  async function deleteItem(itemId: string) {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/boq/${boq.id}/items/${itemId}`,
        { method: "DELETE" },
      );

      if (!result.ok) {
        return;
      }

      setLocalBoq((current) => ({
        ...current,
        items: current.items.filter((row) => row.id !== itemId),
        unsectioned_items: current.unsectioned_items.filter(
          (row) => row.id !== itemId,
        ),
      }));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  async function moveItem(item: BoqItemProgress, direction: -1 | 1) {
    const siblings = itemsForSection(item.section_id).map((row) => row.id);
    const index = siblings.indexOf(item.id);
    const next = index + direction;

    if (index < 0 || next < 0 || next >= siblings.length) {
      return;
    }

    const ids = siblings.slice();
    const [moved] = ids.splice(index, 1);
    ids.splice(next, 0, moved);
    await requestJson(
      `/api/projects/${projectId}/boq/${boq.id}/items/reorder`,
      {
        method: "POST",
        body: JSON.stringify({ ids }),
      },
    );
  }

  async function moveSection(section: BoqSectionSummary, direction: -1 | 1) {
    const ids = boq.sections.map((row) => row.id);
    const index = ids.indexOf(section.id);
    const next = index + direction;

    if (index < 0 || next < 0 || next >= ids.length) {
      return;
    }

    const ordered = ids.slice();
    const [moved] = ordered.splice(index, 1);
    ordered.splice(next, 0, moved);
    await requestJson(
      `/api/projects/${projectId}/boq/${boq.id}/sections/reorder`,
      {
        method: "POST",
        body: JSON.stringify({ ids: ordered }),
      },
    );
  }

  async function deleteSection(sectionId: string) {
    if (isDeletingSection) {
      return;
    }

    setIsDeletingSection(true);

    try {
      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/boq/${boq.id}/sections/${sectionId}`,
        { method: "DELETE" },
      );

      if (result.ok) {
        setLocalBoq((current) => ({
          ...current,
          sections: current.sections.filter((row) => row.id !== sectionId),
        }));
        setSectionDeleteTarget(null);
      }
    } finally {
      setIsDeletingSection(false);
    }
  }

  return (
    <div className="space-y-6">
      <BoqMetaForm projectId={projectId} boq={boq} onChanged={onChanged} />

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-stone-900">Sections</h3>
        <Button onClick={addSection.open} className="h-12 sm:h-10" icon={Plus}>
          Add section
        </Button>
      </div>

      {addSection.isOpen ? (
        <SectionForm
          title="New section"
          onCancel={addSection.close}
          onSubmit={async (values) => {
            const result = await requestJson<{ id: string }>(
              `/api/projects/${projectId}/boq/${boq.id}/sections`,
              {
                method: "POST",
                body: JSON.stringify(values),
              },
            );
            if (result.ok) {
              addSection.close();
              await refresh();
            }
          }}
        />
      ) : null}

      {localBoq.sections.map((section, index) => (
        <section
          key={section.id}
          className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-stone-900">
                {section.name}
              </h4>
              <p className="mt-1 text-sm text-stone-500">
                {formatLabourCost(section.estimated_value)} ·{" "}
                {formatCompletionPercent(section.completion_percentage)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={index === 0}
                onClick={() => void moveSection(section, -1)}
                icon={ArrowUp}
              >
                Up
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={index === localBoq.sections.length - 1}
                onClick={() => void moveSection(section, 1)}
                icon={ArrowDown}
              >
                Down
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRenamingSection(section)}
                icon={Pencil}
              >
                Rename
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setSectionDeleteTarget(section)}
                icon={Trash2}
              >
                Delete
              </Button>
            </div>
          </div>

          {renamingSection?.id === section.id ? (
            <div className="mt-4">
              <SectionForm
                title="Rename section"
                defaultValues={{
                  name: section.name,
                  description: section.description ?? "",
                }}
                onCancel={() => setRenamingSection(null)}
                onSubmit={async (values) => {
                  const result = await requestJson<{ id: string }>(
                    `/api/projects/${projectId}/boq/${boq.id}/sections/${section.id}`,
                    {
                      method: "PATCH",
                      body: JSON.stringify(values),
                    },
                  );
                  if (result.ok) {
                    setRenamingSection(null);
                    await refresh();
                  }
                }}
              />
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {itemsForSection(section.id).map((item, itemIndex, siblings) => (
              <BuilderItemRow
                key={item.id}
                item={item}
                canMoveUp={itemIndex > 0}
                canMoveDown={itemIndex < siblings.length - 1}
                onEdit={() => {
                  setAddingToSection(null);
                  setEditingItem(item);
                }}
                onDelete={() => setDeleteTarget(item)}
                onMove={(direction) => void moveItem(item, direction)}
              />
            ))}
          </div>

          {addingToSection === section.id ||
          editingItem?.section_id === section.id ? (
            <div className="mt-4 rounded-lg border border-stone-100 bg-stone-50 p-4">
              <BoqItemForm
                sections={boq.sections}
                defaultValues={
                  editingItem
                    ? {
                        section_id: editingItem.section_id ?? "",
                        item_code: editingItem.item_code ?? "",
                        description: editingItem.description,
                        item_type: editingItem.item_type,
                        material_id: editingItem.material_id ?? "",
                        unit: editingItem.unit,
                        estimated_quantity: String(
                          editingItem.estimated_quantity,
                        ),
                        rate: String(editingItem.rate),
                        notes: editingItem.notes ?? "",
                      }
                    : { item_type: "work" }
                }
                submitLabel={editingItem ? "Update item" : "Add item"}
                isEdit={Boolean(editingItem)}
                onCancel={() => {
                  setEditingItem(null);
                  setAddingToSection(null);
                }}
                onSubmit={saveItem}
              />
            </div>
          ) : (
            <Button
              variant="secondary"
              className="mt-4 h-12 w-full sm:h-10"
              onClick={() => {
                setEditingItem(null);
                setAddingToSection(section.id);
              }}
              icon={Plus}
            >
              Add item
            </Button>
          )}
        </section>
      ))}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] m-0 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/60"
            aria-label="Close delete confirmation"
            onClick={() => setDeleteTarget(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-boq-item-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2
              id="delete-boq-item-title"
              className="text-base font-semibold text-stone-900"
            >
              Delete item?
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              This will remove{" "}
              <span className="font-medium text-stone-900">
                {deleteTarget.description}
              </span>{" "}
              from this BOQ. This action cannot be undone.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  void deleteItem(deleteTarget.id);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete item"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {sectionDeleteTarget ? (
        <div className="fixed inset-0 z-[60] m-0 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/60"
            aria-label="Close section delete confirmation"
            onClick={() => setSectionDeleteTarget(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-boq-section-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2
              id="delete-boq-section-title"
              className="text-base font-semibold text-stone-900"
            >
              Delete section?
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              This will remove{" "}
              <span className="font-medium text-stone-900">
                {sectionDeleteTarget.name}
              </span>{" "}
              and all items inside it from this BOQ. This action cannot be
              undone.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setSectionDeleteTarget(null)}
                disabled={isDeletingSection}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  void deleteSection(sectionDeleteTarget.id);
                }}
                disabled={isDeletingSection}
              >
                {isDeletingSection ? "Deleting..." : "Delete section"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-dashed border-stone-300 bg-white p-4">
        <h4 className="text-base font-semibold text-stone-900">
          Unsectioned items
        </h4>
        <div className="mt-4 space-y-3">
          {itemsForSection(null).map((item, itemIndex, siblings) => (
            <BuilderItemRow
              key={item.id}
              item={item}
              canMoveUp={itemIndex > 0}
              canMoveDown={itemIndex < siblings.length - 1}
              onEdit={() => {
                setAddingToSection(null);
                setEditingItem(item);
              }}
              onDelete={() => setDeleteTarget(item)}
              onMove={(direction) => void moveItem(item, direction)}
            />
          ))}
        </div>
        {addingToSection === "unsectioned" && !editingItem ? (
          <div className="mt-4 rounded-lg border border-stone-100 bg-stone-50 p-4">
            <BoqItemForm
              sections={boq.sections}
              defaultValues={{ item_type: "work" }}
              submitLabel="Add item"
              onCancel={() => setAddingToSection(null)}
              onSubmit={saveItem}
            />
          </div>
        ) : editingItem && !editingItem.section_id ? (
          <div className="mt-4 rounded-lg border border-stone-100 bg-stone-50 p-4">
            <BoqItemForm
              sections={boq.sections}
              defaultValues={{
                section_id: editingItem.section_id ?? "",
                item_code: editingItem.item_code ?? "",
                description: editingItem.description,
                item_type: editingItem.item_type,
                material_id: editingItem.material_id ?? "",
                unit: editingItem.unit,
                estimated_quantity: String(editingItem.estimated_quantity),
                rate: String(editingItem.rate),
                notes: editingItem.notes ?? "",
              }}
              submitLabel="Update item"
              isEdit
              onCancel={() => setEditingItem(null)}
              onSubmit={saveItem}
            />
          </div>
        ) : (
          <Button
            variant="secondary"
            className="mt-4 h-12 w-full sm:h-10"
            onClick={() => {
              setEditingItem(null);
              setAddingToSection("unsectioned");
            }}
            icon={Plus}
          >
            Add unsectioned item
          </Button>
        )}
      </section>
    </div>
  );
}

function BuilderItemRow({
  item,
  canMoveUp,
  canMoveDown,
  onEdit,
  onDelete,
  onMove,
}: {
  item: BoqItemProgress;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="rounded-lg border border-stone-100 bg-stone-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-stone-900">{item.description}</p>
          <p className="mt-0.5 text-sm text-stone-500">
            {item.estimated_quantity} {item.unit.replaceAll("_", " ")} ×{" "}
            {formatLabourCost(item.rate)} ={" "}
            {formatLabourCost(item.estimated_amount)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
            icon={ArrowUp}
          >
            Up
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
            icon={ArrowDown}
          >
            Down
          </Button>
          <Button variant="secondary" size="sm" onClick={onEdit} icon={Pencil}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete} icon={Trash2}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionForm({
  title,
  defaultValues,
  onSubmit,
  onCancel,
}: {
  title: string;
  defaultValues?: Partial<SectionFormValues>;
  onSubmit: (values: SectionFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const isEdit = Boolean(defaultValues);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SectionFormValues>({
    resolver: zodResolver(createBoqSectionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      ...defaultValues,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-4"
    >
      <h4 className="font-semibold text-stone-900">{title}</h4>
      <div>
        <Label htmlFor="section-name">Name</Label>
        <Input
          id="section-name"
          className="h-12 text-base sm:h-10 sm:text-sm"
          error={Boolean(errors.name)}
          {...register("name")}
        />
      </div>
      <div>
        <Label htmlFor="section-description">Description</Label>
        <Textarea id="section-description" {...register("description")} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} icon={X}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || (isEdit && !isDirty)}
          icon={Save}
        >
          {isSubmitting ? "Saving..." : "Save section"}
        </Button>
      </div>
    </form>
  );
}

function BoqMetaForm({
  projectId,
  boq,
  onChanged,
}: {
  projectId: string;
  boq: BoqDetail;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm({
    defaultValues: {
      name: boq.name,
      description: boq.description ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        const result = await requestJson(
          `/api/projects/${projectId}/boq/${boq.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(values),
          },
        );
        if (result.ok) {
          onChanged?.();
          router.refresh();
        }
      })}
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <div>
        <Label htmlFor="boq-name">BOQ name</Label>
        <Input
          id="boq-name"
          className="h-12 text-base sm:h-10 sm:text-sm"
          {...register("name")}
        />
      </div>
      <div>
        <Label htmlFor="boq-description">Description</Label>
        <Textarea id="boq-description" {...register("description")} />
      </div>
      <Button type="submit" disabled={isSubmitting || !isDirty} icon={Save}>
        {isSubmitting ? "Saving..." : "Save BOQ details"}
      </Button>
    </form>
  );
}
